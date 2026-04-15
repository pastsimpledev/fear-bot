let handler = async (m, { args, conn }) => {
    let who
    if (m.quoted) {
        who = m.quoted.sender
    } else if (m.mentionedJid && m.mentionedJid[0]) {
        who = m.mentionedJid[0]
    } else if (args[0]) {
        who = args[0].replace(/[^0-9]/g, '') + '@s.whatsapp.net'
    } else {
        who = m.sender
    }

    if (who.endsWith('@lid')) {
        const contact = Object.values(conn.contacts || {}).find(c => c.lid === who)
        if (contact && contact.id) {
            who = contact.id
        }
    }

    try {
        let url = await conn.profilePictureUrl(who, 'image')
        
        await conn.sendMessage(m.chat, { 
            image: { url },
            mentions: [who]
        }, { quoted: m })

    } catch (e) {
        m.reply('`𐔌⚠️ ꒱` _Impossibile recuperare la foto profilo. Potrebbe essere nascosta per la privacy o non impostata._')
    }
}

handler.help = ['pic [@user/numero/reply]']
handler.tags = ['info']
handler.command = /^(pic|foto|avatar|getpic)$/i

export default handler