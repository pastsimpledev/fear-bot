import fs from 'fs'
import path from 'path'

const livelliPath = path.join(process.cwd(), 'media/livelli.json')
const walletPath = path.join(process.cwd(), 'media/wallet.json')
const cooldownPath = path.join(process.cwd(), 'media/cooldown_lavoro.json')
const txPath = path.join(process.cwd(), 'media/transazioni.json')

const getDb = (path) => {
    if (!fs.existsSync(path)) fs.writeFileSync(path, JSON.stringify({}))
    try { return JSON.parse(fs.readFileSync(path, 'utf-8')) } catch { return {} }
}

const saveDb = (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2))
}

const formatTime = (ms) => {
    let m = Math.floor(ms / 60000)
    let s = Math.floor((ms % 60000) / 1000)
    return `${m > 0 ? m + 'm ' : ''}${s}s`
}

const getRandom = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

const lavori = [
    { nome: 'Spazzino', xpReq: 0, paga: [150, 300], xpGained: [10, 20] },
    { nome: 'Meccanico', xpReq: 250, paga: [400, 750], xpGained: [30, 60] },
    { nome: 'Programmatore', xpReq: 1000, paga: [1000, 2500], xpGained: [80, 150] }
]

let handler = async (m, { conn, text, usedPrefix, command, args }) => {
    const jid = m.sender
    const nomeUtente = m.pushName || 'Utente'
    
    let livelliDb = getDb(livelliPath)
    let walletDb = getDb(walletPath)
    let cooldowns = getDb(cooldownPath)
    let txDb = getDb(txPath)

    if (!livelliDb[jid]) livelliDb[jid] = { level: 1, xp: 0, lastMsgCount: 0, lavoro: null }
    if (!walletDb[jid]) walletDb[jid] = { money: 0 }
    if (!txDb[jid]) txDb[jid] = []
    
    const userLvl = livelliDb[jid]

    if (command === 'lavoro') {
        if (!args[0]) {
            let txt = `╭┈➤ 『 💼 』 *CENTRO IMPIEGO*\n`
            txt += `┆  『 👤 』 *UTENTE:* ${nomeUtente}\n`
            txt += `┆  『 📊 』 *XP:* ${userLvl.xp}\n`
            txt += `┆  『 🛠️ 』 *STATO:* ${userLvl.lavoro || 'Disoccupato'}\n`
            txt += `┆\n`
            txt += `┆  *LISTA PROFESSIONI:*\n`
            
            lavori.forEach(l => {
                const check = userLvl.xp >= l.xpReq ? '✅' : '❌'
                txt += `┆  ${check} *${l.nome}* (${l.xpReq} XP)\n`
            })
            txt += `┆\n`
            txt += `┆  *Clicca un bottone per scegliere!*\n`
            txt += `╰┈➤ 『 📦 』 \`annoyed system\``

            const buttons = lavori.map(l => ({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({ 
                    display_text: `${l.nome.toUpperCase()} (${l.xpReq} XP)`, 
                    id: `${usedPrefix}lavoro scegli ${l.nome.toLowerCase()}` 
                })
            }))

            const msg = {
                viewOnceMessage: {
                    message: {
                        interactiveMessage: {
                            body: { text: txt },
                            footer: { text: "annoyed system" },
                            nativeFlowMessage: { buttons },
                            contextInfo: { 
                                mentionedJid: [jid],
                                stanzaId: "job_menu"
                            }
                        }
                    }
                }
            }

            return await conn.relayMessage(m.chat, msg, {})
        }

        if (args[0] === 'scegli') {
            const scelta = args.slice(1).join(' ').toLowerCase().trim()
            const lavoroTrovato = lavori.find(l => l.nome.toLowerCase() === scelta)

            if (!lavoroTrovato) return m.reply('`𐔌❌꒱` Lavoro non trovato.')
            if (userLvl.xp < lavoroTrovato.xpReq) return m.reply(`\`𐔌🚫꒱\` Requisiti insufficienti! Ti servono ${lavoroTrovato.xpReq} XP.`)

            userLvl.lavoro = lavoroTrovato.nome
            saveDb(livelliPath, livelliDb)

            let cap = `╭┈➤ 『 ✅ 』 *LAVORO OTTENUTO*\n`
            cap += `┆  『 💼 』 *IMPIEGO:* ${lavoroTrovato.nome}\n`
            cap += `┆  『 💰 』 *PAGA:* €${lavoroTrovato.paga[0]}-${lavoroTrovato.paga[1]}\n`
            cap += `╰┈➤ 『 🛠️ 』 \`scrivi ${usedPrefix}lavora per iniziare\``
            return m.reply(cap)
        }
    }

    if (command === 'lavora') {
        if (!userLvl.lavoro) return m.reply(`\`𐔌⚠️꒱\` Non hai un lavoro! Usa ${usedPrefix}lavoro`)

        const baseCooldown = 10 * 60 * 1000 
        const riduzione = userLvl.xp * 100 
        const tempoAttesa = Math.max(60000, baseCooldown - riduzione)
        const ora = Date.now()
        const lastWork = cooldowns[jid] || 0

        if (ora - lastWork < tempoAttesa) {
            const rimanente = tempoAttesa - (ora - lastWork)
            return m.reply(`\`𐔌⏳꒱\` Sei stanco! Riposa ancora *${formatTime(rimanente)}*`)
        }

        const lavoroAttuale = lavori.find(l => l.nome === userLvl.lavoro)
        const pagaRandom = getRandom(lavoroAttuale.paga[0], lavoroAttuale.paga[1])
        const xpRandom = getRandom(lavoroAttuale.xpGained[0], lavoroAttuale.xpGained[1])

        walletDb[jid].money += pagaRandom
        userLvl.xp += xpRandom
        cooldowns[jid] = ora

        txDb[jid].push({ type: 'entrata', amount: pagaRandom, date: ora, description: `Stipendio ${lavoroAttuale.nome}` })

        saveDb(livelliPath, livelliDb)
        saveDb(walletPath, walletDb)
        saveDb(cooldownPath, cooldowns)
        saveDb(txPath, txDb)

        let resTxt = `╭┈➤ 『 🛠️ 』 *TURNO COMPLETATO*\n`
        resTxt += `┆  『 💼 』 *IMPIEGO:* ${lavoroAttuale.nome}\n`
        resTxt += `┆  『 💰 』 *GUADAGNO:* +${pagaRandom}€\n`
        resTxt += `┆  『 ✨ 』 *XP:* +${xpRandom}\n`
        resTxt += `┆  『 🏦 』 *SALDO:* ${walletDb[jid].money}€\n`
        resTxt += `╰┈➤ 『 📦 』 \`annoyed system\``

        return m.reply(resTxt)
    }

    if (command === 'licenziati') {
        if (!userLvl.lavoro) return m.reply('`𐔌⚠️꒱` Non hai un impiego.')
        const exJob = userLvl.lavoro
        userLvl.lavoro = null
        saveDb(livelliPath, livelliDb)
        return m.reply(`╭┈➤ 『 🚪 』 *DIMISSIONI*\n┆  『 💼 』 *EX IMPIEGO:* ${exJob}\n╰┈➤ 『 📦 』 \`ora sei disoccupato\``)
    }
}

handler.command = ['lavoro', 'lavora', 'licenziati']
handler.tags = ['rpg']
handler.help = ['lavoro', 'lavora', 'licenziati']
handler.group = true

export default handler