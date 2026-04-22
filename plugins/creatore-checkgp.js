const handler = async (m, { conn, text, args, usedPrefix, command }) => {
    const link = args.length >= 1 ? args[0] : text
    const regex = /chat\.whatsapp\.com\/([0-9A-Za-z]{20,24})/i
    const match = link ? link.match(regex) : null

    if (!match) return m.reply(`\`𐔌⚠️꒱\` Inserisci un link valido.\nEsempio: *${usedPrefix + command}* https://chat.whatsapp.com/xxx`)

    const code = match[1]

    try {
        const res = await conn.groupGetInviteInfo(code)
        
        const subject = res.subject || 'Nessun Titolo'
        const description = res.desc || 'Nessuna descrizione presente.'
        const size = res.size || 'Sconosciuto'
        const id = res.id || 'Sconosciuto'
        const owner = res.owner || ''
        const creation = res.creation ? new Date(res.creation * 1000).toLocaleString('it-IT') : 'Sconosciuta'
        
        // Verifica se il founder è admin (se i dati dei partecipanti sono disponibili)
        let founderStatus = 'Dato non disponibile'
        if (res.participants) {
            const adminParticipant = res.participants.find(p => p.id === owner)
            founderStatus = adminParticipant ? (adminParticipant.admin ? 'Sì ✅' : 'No ❌') : 'Non presente nel gruppo ❌'
        }

        let txt = `╭┈➤ 『 🔍 』 *INFO GRUPPO*\n`
        txt += `┆  『 📌 』 *TITOLO:* ${subject}\n`
        txt += `┆  『 🆔 』 *ID:* ${id}\n`
        txt += `┆  『 👥 』 *MEMBRI:* ${size}\n`
        txt += `┆  『 👑 』 *FOUNDER:* ${owner ? '@' + owner.split('@')[0] : 'Sconosciuto'}\n`
        txt += `┆  『 🛡️ 』 *FOUNDER ADMIN:* ${founderStatus}\n`
        txt += `┆  『 📅 』 *CREATO IL:* ${creation}\n`
        txt += `┆\n`
        txt += `┆  『 📝 』 *DESCRIZIONE:*\n`
        txt += `┆  ${description}\n`
        txt += `╰┈➤ 『 📦 』 \`annoyed system\``

        // Recupero foto profilo del gruppo (se presente)
        let pp = 'https://telegra.ph/file/241d774889600a7479836.jpg' // Default se fallisce
        try {
            pp = await conn.profilePictureUrl(id, 'image')
        } catch {
            // Se non accessibile, proviamo a usare quella dell'invito se Baileys la fornisce
            if (res.thumbVcard) pp = res.thumbVcard
        }

        await conn.sendMessage(m.chat, {
            text: txt,
            contextInfo: {
                mentionedJid: owner ? [owner] : [],
                externalAdReply: {
                    title: `CHECK GRUPPO: ${subject}`,
                    body: subject,
                    thumbnailUrl: pp,
                    sourceUrl: link,
                    mediaType: 1,
                    renderLargerThumbnail: true
                }
            }
        }, { quoted: m })

    } catch (e) {
        console.error(e)
        if (e.message?.includes('404')) return m.reply('`𐔌❌꒱` Link scaduto o non valido.')
        if (e.message?.includes('401')) return m.reply('`𐔌❌꒱` Non autorizzato a leggere le info.')
        m.reply(`\`𐔌❌꒱\` Errore: ${e.message}`)
    }
}

handler.help = ['checkgp <link>']
handler.tags = ['tools']
handler.command = ['checkgp', 'infogp']

export default handler