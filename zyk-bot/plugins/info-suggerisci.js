let handler = async (m, { conn, text, usedPrefix, command }) => {
    if (!text) {
        let errore = `*『 ❌ 』 SINTASSI ERRATA*\n\n`
        errore += `Utilizza il comando in questo modo:\n`
        errore += `> *${usedPrefix + command}* nome comando | descrizione\n\n`
        errore += `_⚠️ Nota: È possibile suggerire un solo comando alla volta. Le richieste troll o spam comporteranno il ban immediato dal bot._`
        return m.reply(errore)
    }

    let [cmdName, ...desc] = text.split('|')
    let description = desc.join('|').trim()

    if (!cmdName || !description) {
        let errore = `*『 ❌ 』 MANCA QUALCOSA*\n\n`
        errore += `Assicurati di usare la barra verticale *|* per separare il nome dalla descrizione.\n`
        errore += `Esempio: _${usedPrefix + command} kickall | serve a kickare tutti_`
        return m.reply(errore)
    }

    const logGroup = '120363403043504351@g.us'
    const userPush = `@${m.sender.split('@')[0]}`
    
    let report = `╭┈  『 💡 』 *NUOVO SUGGERIMENTO*\n`
    report += `┆  『 👤 』 *utente* ─ ${userPush}\n`
    report += `┆  『 ⌨️ 』 *comando* ─ ${cmdName.trim()}\n`
    report += `┆  『 📝 』 *descrizione* ─ ${description}\n`
    report += `╰┈➤ 『 🕒 』 *data* ─ ${new Date().toLocaleString('it-IT')}`

    // Fake reply per il log
    const fakeReply = {
        key: { fromMe: false, participant: m.sender, remoteJid: 'status@broadcast' },
        message: { contactMessage: { displayName: m.pushName, vcard: `BEGIN:VCARD\nVERSION:3.0\nN:;${m.pushName};;;\nFN:${m.pushName}\nitem1.TEL;waid=${m.sender.split('@')[0]}:${m.sender.split('@')[0]}\nitem1.X-ABLabel:Ponsel\nEND:VCARD` } }
    }

    await conn.sendMessage(logGroup, { 
        text: report, 
        mentions: [m.sender],
        ...(global.newsletter ? global.newsletter() : {})
    }, { quoted: fakeReply })

    await m.reply('`𐔌✅ ꒱` _Il tuo suggerimento è stato inviato allo staff. Grazie per la collaborazione!_')
}

handler.help = ['suggerisci <comando> | <descrizione>']
handler.tags = ['info']
handler.command = /^(suggerisci|suggerimento|suggest)$/i

export default handler