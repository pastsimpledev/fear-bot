import chalk from 'chalk'

let cleanerInterval = null

export function startCleaner(conn) {
    if (cleanerInterval) clearInterval(cleanerInterval)

    cleanerInterval = setInterval(() => runCleaner(conn), 5 * 60 * 1000)

    console.log(chalk.grey('[CLEANER] avviato, pulizia ogni 5 minuti'))
}

async function runCleaner(conn) {
    const before = process.memoryUsage().heapUsed

    cleanConnChats(conn)
    cleanGlobalDb()
    cleanPlugins()

    if (global.gc) {
        try { global.gc() } catch (e) {}
    }

    const after = process.memoryUsage().heapUsed
    const freed = ((before - after) / 1024 / 1024).toFixed(2)
    const total = (after / 1024 / 1024).toFixed(2)

    console.log(chalk.grey(`[CLEANER] RAM: ${total} MB usati | liberati: ${freed} MB`))
}

function cleanConnChats(conn) {
    if (!conn?.chats) return

    const keys = Object.keys(conn.chats)
    let removed = 0

    for (const jid of keys) {
        const chat = conn.chats[jid]
        if (!chat) { delete conn.chats[jid]; removed++; continue }

        if (chat.metadata) {
            delete chat.metadata.desc
            delete chat.metadata.owner
            delete chat.metadata.creation
            delete chat.metadata.size
            delete chat.metadata.ephemeralDuration
            delete chat.metadata.memberAddMode

            if (Array.isArray(chat.metadata.participants)) {
                for (const p of chat.metadata.participants) {
                    delete p.name
                    delete p.notify
                    delete p.verifiedName
                }
            }
        }

        delete chat.participants
        delete chat.desc
        delete chat.owner
        delete chat.size
        delete chat.creation
    }
}

function cleanGlobalDb() {
    if (!global.db?.data) return

    const { users, groups, chats } = global.db.data

    if (chats) {
        for (const jid in chats) {
            if (jid.endsWith('@g.us')) {
                delete global.db.data.chats[jid]
                continue
            }
            const c = chats[jid]
            if (c) {
                delete c.metadata
                delete c.participants
                delete c.desc
                delete c.owner
                delete c.size
                delete c.creation
            }
        }
    }

    if (groups) {
        for (const jid in groups) {
            const g = groups[jid]
            if (g) {
                delete g.metadata
                delete g.participants
                delete g.desc
                delete g.owner
                delete g.size
                delete g.creation
            }
        }
    }

    if (users) {
        for (const jid in users) {
            const u = users[jid]
            if (!u) { delete global.db.data.users[jid]; continue }

            if (u.warns && typeof u.warns === 'object') {
                const warnKeys = Object.keys(u.warns)
                if (warnKeys.length === 0) delete u.warns
            }
        }
    }
}

function cleanPlugins() {
    if (!global.plugins) return

    for (const name in global.plugins) {
        const plugin = global.plugins[name]
        if (!plugin) {
            delete global.plugins[name]
            continue
        }

        if (plugin._cache && typeof plugin._cache === 'object') {
            plugin._cache = {}
        }
        if (plugin._games && typeof plugin._games === 'object') {
            const now = Date.now()
            for (const key in plugin._games) {
                const game = plugin._games[key]
                if (game?.lastActivity && now - game.lastActivity > 30 * 60 * 1000) {
                    delete plugin._games[key]
                }
            }
        }
    }
}

export function stopCleaner() {
    if (cleanerInterval) {
        clearInterval(cleanerInterval)
        cleanerInterval = null
    }
}
