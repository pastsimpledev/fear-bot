let handler = async (m, { conn, text }) => {
    if (!text) return m.reply(`『 ❌ 』 Inserisci il testo dell'annuncio.\nEsempio: .podcast Ciao a tutti!`)

    let groups = []
    try {
        const chats = await conn.groupFetchAllParticipating()
        groups = Object.keys(chats)
    } catch (e) {
        groups = Object.entries(conn.chats || {}).filter(([jid, chat]) => jid.endsWith('@g.us') && chat.isChats).map(v => v[0])
    }

    if (groups.length === 0) return m.reply(`『 ⚠️ 』 Non sono in nessun gruppo o non ho potuto recuperare la lista.`)

    await m.reply(`『 🕒 』 Inizio invio annuncio in ${groups.length} gruppi...`)

    const annuncio = `${text}`

    for (let id of groups) {
        try {
            let groupMetadata = await conn.groupMetadata(id).catch(() => null)
            let participants = groupMetadata ? groupMetadata.participants.map(p => p.id) : []

            await conn.sendMessage(id, { 
                text: annuncio, 
                mentions: participants,
                ...(global.newsletter ? global.newsletter() : {})
            })
            
            await new Promise(resolve => setTimeout(resolve, 2000))
        } catch (e) {
            continue
        }
    }

    await m.reply(`『 ✅ 』 Podcast completato con successo.`)
}

handler.help = ['podcast <testo>']
handler.tags = ['owner']
handler.command = /^(podcast|broadcastgroup|bcgc)$/i
handler.owner = true

export default handler