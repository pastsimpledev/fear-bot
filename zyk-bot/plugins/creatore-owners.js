import fs from 'fs'
import path from 'path'

let handler = async (m, { conn, text, command }) => {
    const dir = path.join(process.cwd(), 'media')
    const ownersPath = path.join(dir, 'owners.json')
    
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(ownersPath)) fs.writeFileSync(ownersPath, JSON.stringify({ dynamicOwners: [] }, null, 2))
    
    let db = JSON.parse(fs.readFileSync(ownersPath, 'utf-8'))
    if (!db.dynamicOwners) db.dynamicOwners = []

    if (command === 'addowner') {
        let who
        let name
        
        if (m.quoted) {
            who = m.quoted.sender
            name = text.trim()
        } else if (m.mentionedJid && m.mentionedJid[0]) {
            who = m.mentionedJid[0]
            name = text.replace(/@\d+/g, '').trim()
        } else if (text) {
            let [num, ...rest] = text.split(' ')
            who = num.replace(/[^0-9]/g, '') + '@s.whatsapp.net'
            name = rest.join(' ').trim()
        }

        if (!who || !name) return m.reply(`『 ❌ 』 Uso corretto: \n.addowner @utente Nome\n.addowner numero Nome\n(Oppure rispondi a un msg) .addowner Nome`)

        if (db.dynamicOwners.some(o => o.jid === who)) return m.reply(`『 ⚠️ 』 Questo utente è già un owner.`)

        db.dynamicOwners.push({ jid: who, name: name })
        fs.writeFileSync(ownersPath, JSON.stringify(db, null, 2))
        
        let msg = `╭┈  『 👑 』 \`nuovo owner\`\n┆  『 👤 』 \`utente\` ─ @${who.split('@')[0]}\n┆  『 🏷️ 』 \`nome\` ─ ${name}\n╰┈➤ 『 ✅ 』 \`aggiunto con successo\``
        return conn.sendMessage(m.chat, { text: msg, mentions: [who] }, { quoted: m })
    }

    if (command === 'delowner' || command === 'removeowner') {
        let who = m.quoted ? m.quoted.sender : m.mentionedJid && m.mentionedJid[0] ? m.mentionedJid[0] : text ? text.replace(/[^0-9]/g, '') + '@s.whatsapp.net' : false
        
        if (!who) return m.reply(`『 ❌ 』 Chi dovrei rimuovere?`)

        if (!db.dynamicOwners.some(o => o.jid === who)) return m.reply(`『 ⚠️ 』 L'utente non è tra gli owner dinamici.`)

        db.dynamicOwners = db.dynamicOwners.filter(o => o.jid !== who)
        fs.writeFileSync(ownersPath, JSON.stringify(db, null, 2))
        
        return m.reply(`『 🗑️ 』 Owner rimosso con successo.`)
    }
}

handler.help = ['addowner <numero/tag> <nome>', 'delowner']
handler.tags = ['owner']
handler.command = /^(addowner|delowner|removeowner)$/i
handler.owner = true

export default handler