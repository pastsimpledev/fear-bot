import express from 'express';
import fs from 'fs';
import cors from 'cors';
import chalk from 'chalk';
import crypto from 'crypto';
import os from 'os';

const app = express();
const port = 3000;

const authCodes  = new Map(); // code → { jid, expires }
const authTokens = new Map(); // token → { jid, expires }

// ================================================================
// CORS — accetta sia http che https e localhost per dev
// ================================================================
const ALLOWED_ORIGINS = [
    'https://bereshit.ddns.net',
    'http://bereshit.ddns.net',
    'http://localhost',
    'http://127.0.0.1'
];

app.use(cors({
    origin: (origin, cb) => {
        if (!origin) return cb(null, true); // curl, Postman, app
        if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
        cb(new Error(`CORS bloccato: ${origin}`));
    },
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.options('/{*path}', cors()); // pre-flight
app.use(express.json());

// ================================================================
// HELPERS
// ================================================================

const loadJson = (path) => {
    try { return JSON.parse(fs.readFileSync(path, 'utf-8')) } catch { return {} }
}

const saveJson = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
}

function requireAuth(req, res, next) {
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    const session = authTokens.get(token);

    if (!session || session.expires < Date.now()) {
        return res.status(401).json({ success: false, message: 'Token non valido o scaduto' });
    }

    req.jid = session.jid;
    authTokens.set(token, { ...session, expires: Date.now() + 24 * 60 * 60000 }); // rolling 24h
    next();
}

function getConn() {
    return global.conn || null;
}

// ================================================================
// AUTH ENDPOINTS
// ================================================================

// Chiamato dal bot quando l'utente usa .auth
app.post('/api/internal/generate-auth', (req, res) => {
    const { jid } = req.body;
    if (!jid) return res.status(400).json({ success: false, message: 'JID mancante' });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    authCodes.set(code, { jid, expires: Date.now() + 5 * 60000 });

    console.log(chalk.yellow(`[ AUTH ] Codice generato per ${jid}: ${code}`));
    res.json({ success: true, code });
});

// Chiamato dal sito per verificare il codice OTP
app.post('/api/auth/verify', (req, res) => {
    const { code } = req.body;
    if (!code) return res.status(400).json({ success: false, message: 'Codice mancante' });

    const authData = authCodes.get(code);

    if (!authData || authData.expires < Date.now()) {
        authCodes.delete(code);
        return res.status(400).json({ success: false, message: 'Codice errato o scaduto' });
    }

    authCodes.delete(code);

    const token = crypto.randomBytes(32).toString('hex');
    authTokens.set(token, { jid: authData.jid, expires: Date.now() + 24 * 60 * 60000 });

    console.log(chalk.green(`[ AUTH ] Login riuscito per ${authData.jid}`));
    res.json({ success: true, token, jid: authData.jid });
});

// ================================================================
// PROFILE ENDPOINTS
// ================================================================

app.get('/api/profile', requireAuth, async (req, res) => {
    const jid  = req.jid;
    const conn = getConn();

    const usersDb       = global.db?.data?.users || loadJson('./media/db.json');
    const walletDb      = loadJson('./media/wallet.json');
    const livelliDb     = loadJson('./media/livelli.json');
    const compleanniDb  = loadJson('./media/compleanni.json');
    const descrizioniDb = loadJson('./media/descrizioni.json');
    const genereDb      = loadJson('./media/genere.json');
    const igDb          = loadJson('./media/instagram.json');

    const allData  = usersDb?.users || usersDb;
    const userData = allData[jid] || {};
    const wallet   = walletDb[jid]  || { money: 0, bank: 0 };
    const livello  = livelliDb[jid] || { level: 1, xp: 0 };

    // Rank globale messaggi
    const rank = (Object.entries(allData)
        .filter(([id, d]) => id.endsWith('@s.whatsapp.net') && (d.messages > 0))
        .sort((a, b) => (b[1].messages || 0) - (a[1].messages || 0))
        .findIndex(([id]) => id === jid) + 1) || null;

    const ig = userData.ig || igDb[jid] || null;

    // Foto profilo e flag Business — richiedono conn Baileys attiva
    let profilePicUrl = null;
    let isBusiness    = false;

    if (conn) {
        try {
            profilePicUrl = await conn.profilePictureUrl(jid, 'image');
        } catch (_) {
            // Privacy impostata o nessuna foto — normale, non blocca
        }

        try {
            const biz = await conn.getBusinessProfile(jid);
            isBusiness = !!(biz && (biz.description !== undefined || biz.category !== undefined));
        } catch (_) {
            // Non è un account business
        }
    }

    res.json({
        success: true,
        profile: {
            jid,
            name:          userData.name || userData.pushName || null,
            level:         livello.level  || 1,
            xp:            livello.xp     || 0,
            messages:      userData.messages || 0,
            rank:          rank || null,
            money:         wallet.money || 0,
            bank:          wallet.bank  || 0,
            ig,
            bio:           descrizioniDb[jid] || '',
            genere:        genereDb[jid]      || '',
            bday:          compleanniDb[jid]  || '',
            profilePicUrl,
            isBusiness
        }
    });
});

app.post('/api/profile/update', requireAuth, (req, res) => {
    const jid = req.jid;
    const { field, value } = req.body;

    const allowed = ['ig', 'bio', 'genere', 'bday'];
    if (!allowed.includes(field))
        return res.status(400).json({ success: false, message: 'Campo non consentito' });

    if (field === 'ig' && value && !/^[a-zA-Z0-9._]{0,30}$/.test(value))
        return res.status(400).json({ success: false, message: 'Username Instagram non valido' });
    if (field === 'bio' && value && value.length > 160)
        return res.status(400).json({ success: false, message: 'Bio troppo lunga' });
    if (field === 'genere' && !['maschio', 'femmina', 'altro'].includes(value?.toLowerCase()))
        return res.status(400).json({ success: false, message: 'Genere non valido' });

    const fileMap = {
        ig:     './media/instagram.json',
        bio:    './media/descrizioni.json',
        genere: './media/genere.json',
        bday:   './media/compleanni.json'
    };

    // ig può stare anche dentro global.db.data.users[jid].ig
    if (field === 'ig' && global.db?.data?.users) {
        if (!global.db.data.users[jid]) global.db.data.users[jid] = {};
        global.db.data.users[jid].ig = value || null;
        global.db.save?.();
    }

    try {
        const filePath = fileMap[field];
        const db       = loadJson(filePath);

        if (value === '' || value === null || value === undefined) {
            delete db[jid];
        } else {
            db[jid] = field === 'genere' ? value.toLowerCase() : value;
        }

        saveJson(filePath, db);
        console.log(chalk.blue(`[ PROFILE ] ${jid} → ${field} = "${value}"`));
        res.json({ success: true });

    } catch (err) {
        console.error(chalk.red(`[ PROFILE ] Errore scrittura ${field}:`), err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

app.post('/api/profile/reset', requireAuth, (req, res) => {
    const jid = req.jid;
    const files = [
        './media/descrizioni.json',
        './media/genere.json',
        './media/compleanni.json',
        './media/instagram.json'
    ];

    try {
        files.forEach(p => {
            const db = loadJson(p);
            delete db[jid];
            saveJson(p, db);
        });

        if (global.db?.data?.users?.[jid]) {
            delete global.db.data.users[jid].ig;
            global.db.save?.();
        }

        console.log(chalk.yellow(`[ PROFILE ] Reset profilo per ${jid}`));
        res.json({ success: true });

    } catch (err) {
        console.error(chalk.red('[ PROFILE ] Errore reset:'), err);
        res.status(500).json({ success: false, message: 'Errore interno del server' });
    }
});

// ================================================================
// GROUPS HELPERS
// ================================================================

function buildLidMap(participants) {
    const map = {};
    participants.forEach(p => {
        const lidNum = p.lid
            ? p.lid.split('@')[0]
            : (p.id?.includes('@lid') ? p.id.split('@')[0] : null);
        const jidNum = p.jid
            ? p.jid.split('@')[0].split(':')[0]
            : (p.id?.includes('@s.whatsapp.net') ? p.id.split('@')[0].split(':')[0] : null);
        if (lidNum && jidNum) map[lidNum] = jidNum;
    });
    return map;
}

function resolveJid(p, lidMap) {
    if (p.jid?.includes('@s.whatsapp.net')) return p.jid.split(':')[0];
    if (p.id?.includes('@s.whatsapp.net'))  return p.id.split(':')[0];

    const lidNum = p.lid
        ? p.lid.split('@')[0]
        : (p.id?.includes('@lid') ? p.id.split('@')[0] : null);

    if (lidNum && lidMap[lidNum]) return lidMap[lidNum] + '@s.whatsapp.net';
    return p.id || null;
}

function getContactName(conn, jid) {
    const c = conn.store?.contacts?.[jid] || conn.contacts?.[jid] || {};
    return c.pushName || c.verifiedName || c.name || null;
}

function extractFeatures(dbData) {
    return {
        antilink:     dbData.antilink     ?? false,
        antiwhatsapp: dbData.antiwhatsapp ?? false,
        soloadmin:    dbData.soloadmin    ?? false,
        antilinkuni:  dbData.antilinkuni  ?? false,
        antitg:       dbData.antitg       ?? false,
        antinsta:     dbData.antinsta     ?? false,
        antinuke:     dbData.antinuke     ?? false,
        benvenuto:    dbData.benvenuto    ?? false,
        rileva:       dbData.rileva       ?? false,
    };
}

// ================================================================
// GROUPS ENDPOINTS
// ================================================================

// GET /api/groups — lista leggera (senza foto di tutti i membri)
app.get('/api/groups', async (req, res) => {
    const conn = getConn();
    if (!conn) return res.status(503).json({
        success: false,
        message: 'Bot non ancora connesso, riprova tra qualche secondo.'
    });

    try {
        const usersDb   = global.db?.data?.users || loadJson('./media/db.json');
        const allData   = usersDb?.users || usersDb;
        const groupJids = Object.keys(allData).filter(j => j.endsWith('@g.us'));

        if (groupJids.length === 0)
            return res.json({ success: true, groups: [] });

        const groups = await Promise.all(groupJids.map(async (gid) => {
            try {
                const meta   = await conn.groupMetadata(gid);
                const lidMap = buildLidMap(meta.participants);

                let pic = null;
                try { pic = await conn.profilePictureUrl(gid, 'image'); } catch (_) {}

                const admins = await Promise.all(
                    meta.participants
                        .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                        .map(async (p) => {
                            const rjid = resolveJid(p, lidMap);
                            let aPic = null;
                            try { aPic = await conn.profilePictureUrl(rjid, 'image'); } catch (_) {}
                            return { jid: rjid, admin: p.admin, name: getContactName(conn, rjid), pic: aPic };
                        })
                );

                const dbData = allData[gid] || {};
                return {
                    jid:         gid,
                    name:        meta.subject || gid,
                    desc:        meta.desc    || '',
                    pic,
                    memberCount: meta.participants.length,
                    admins,
                    features:    extractFeatures(dbData),
                    messages:    dbData.messages || 0
                };
            } catch (e) {
                console.warn(chalk.gray(`[ GROUPS ] Saltato ${gid}: ${e.message}`));
                return null;
            }
        }));

        res.json({ success: true, groups: groups.filter(Boolean) });

    } catch (err) {
        console.error(chalk.red('[ GROUPS ] Errore lista:'), err);
        res.status(500).json({ success: false, message: 'Errore interno' });
    }
});

// GET /api/groups/:gid — dettaglio con tutti i membri
app.get('/api/groups/:gid', async (req, res) => {
    // IMPORTANTE: decodeURIComponent prima della validazione
    // Il browser codifica @ come %40 nell'URL
    const gid = decodeURIComponent(req.params.gid);

    if (!gid.endsWith('@g.us'))
        return res.status(400).json({ success: false, message: 'GID non valido' });

    const conn = getConn();
    if (!conn) return res.status(503).json({ success: false, message: 'Bot non connesso.' });

    try {
        const meta   = await conn.groupMetadata(gid);
        const lidMap = buildLidMap(meta.participants);

        let pic = null;
        try { pic = await conn.profilePictureUrl(gid, 'image'); } catch (_) {}

        // Fetch foto profilo in batch da 8 per non sovraccaricare WhatsApp
        const BATCH   = 8;
        const members = [];
        for (let i = 0; i < meta.participants.length; i += BATCH) {
            const results = await Promise.all(
                meta.participants.slice(i, i + BATCH).map(async (p) => {
                    const rjid = resolveJid(p, lidMap);
                    let mPic = null;
                    try { mPic = await conn.profilePictureUrl(rjid, 'image'); } catch (_) {}
                    return { jid: rjid, name: getContactName(conn, rjid), admin: p.admin || null, pic: mPic };
                })
            );
            members.push(...results);
        }

        const usersDb = global.db?.data?.users || loadJson('./media/db.json');
        const allData = usersDb?.users || usersDb;
        const dbData  = allData[gid] || {};

        res.json({
            success: true,
            group: {
                jid:         gid,
                name:        meta.subject || gid,
                desc:        meta.desc    || '',
                pic,
                memberCount: meta.participants.length,
                members,
                features:    extractFeatures(dbData),
                messages:    dbData.messages || 0
            }
        });

    } catch (err) {
        console.error(chalk.red('[ GROUPS ] Errore dettaglio:'), err);
        res.status(500).json({ success: false, message: 'Errore nel caricare il gruppo' });
    }
});

// POST /api/groups/toggle — attiva/disattiva funzione (solo admin del gruppo)
app.post('/api/groups/toggle', requireAuth, async (req, res) => {
    const { gid, feature, value } = req.body;
    const jid = req.jid;

    const ALLOWED_FEATURES = [
        'antilink','antiwhatsapp','soloadmin','antilinkuni',
        'antitg','antinsta','antinuke','benvenuto','rileva'
    ];

    if (!gid?.endsWith('@g.us'))
        return res.status(400).json({ success: false, message: 'Gruppo non valido' });
    if (!ALLOWED_FEATURES.includes(feature))
        return res.status(400).json({ success: false, message: 'Funzione non valida' });

    const conn = getConn();
    if (!conn) return res.status(503).json({ success: false, message: 'Bot non connesso.' });

    try {
        const meta   = await conn.groupMetadata(gid);
        const lidMap = buildLidMap(meta.participants);

        const userNum = jid.split('@')[0];
        const isAdmin = meta.participants.some(p => {
            if (p.admin !== 'admin' && p.admin !== 'superadmin') return false;
            const rjid = resolveJid(p, lidMap);
            return rjid && rjid.split('@')[0] === userNum;
        });

        if (!isAdmin)
            return res.status(403).json({ success: false, message: 'Non sei admin di questo gruppo' });

        if (global.db?.data?.users) {
            if (!global.db.data.users[gid]) global.db.data.users[gid] = {};
            global.db.data.users[gid][feature] = value;
            global.db.save?.();
        } else {
            const dbPath = './media/db.json';
            const db     = loadJson(dbPath);
            if (!db[gid]) db[gid] = {};
            db[gid][feature] = value;
            saveJson(dbPath, db);
        }

        console.log(chalk.blue(`[ GROUPS ] ${jid} → ${gid} → ${feature} = ${value}`));
        res.json({ success: true });

    } catch (err) {
        console.error(chalk.red('[ GROUPS ] Errore toggle:'), err);
        res.status(500).json({ success: false, message: 'Errore interno' });
    }
});

// ================================================================
// PING
// ================================================================

app.get('/ping', (req, res) => {
    res.json({
        status:      'online',
        timestamp:   Date.now(),
        server_info: {
            uptime:       Math.floor(process.uptime()) + 's',
            platform:     os.platform(),
            memory_usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB'
        }
    });
});

// ================================================================
// STATS
// ================================================================

app.get('/api/stats', (req, res) => {
    try {
        const usersDb   = global.db?.data?.users || loadJson('./media/db.json');
        const allData   = usersDb?.users || usersDb;
        const userCount = Object.keys(allData).filter(j => j.endsWith('@s.whatsapp.net')).length;

        let version = '—';
        try { version = JSON.parse(fs.readFileSync('./package.json', 'utf-8')).version || '—'; } catch (_) {}

        const sec = Math.floor(process.uptime());
        const uptime = [
            Math.floor(sec / 86400) > 0 ? `${Math.floor(sec / 86400)}g` : '',
            Math.floor((sec % 86400) / 3600) > 0 ? `${Math.floor((sec % 86400) / 3600)}h` : '',
            Math.floor((sec % 3600) / 60) > 0 ? `${Math.floor((sec % 3600) / 60)}m` : '',
            `${sec % 60}s`
        ].filter(Boolean).join(' ');

        res.json({ success: true, stats: { users: userCount, version, uptime, online: true } });

    } catch (err) {
        console.error(chalk.red('[ STATS ] Errore:'), err);
        res.status(500).json({ success: false });
    }
});

// ================================================================
// START
// ================================================================

export function startDashboard() {
    app.listen(port, '0.0.0.0', () => {
        console.log(chalk.blue(`[ SERVER ]`) + ` Liquid API Online su porta ${port}`);
    });
}