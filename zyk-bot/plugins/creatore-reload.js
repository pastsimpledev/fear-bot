import { jidNormalizedUser } from "@realvare/baileys"

let handler = async (m, { conn, isOwner }) => {
    if (!isOwner) return
    
    m.reply(`_🔄 Recupero dei gruppi in corso..._`)

    try {
        // Recupera tutti i gruppi direttamente dal server WhatsApp
        let groups = await conn.groupFetchAllParticipating()
        let groupList = Object.values(groups)
        let totalGroups = groupList.length
        let totalUsers = 0
        let report = `*🔄 RELOAD METADATA GLOBALE*\n\n`

        if (totalGroups === 0) return m.reply("`❌` _Il bot non è presente in alcun gruppo._")

        for (let metadata of groupList) {
            let jid = metadata.id
            let participants = metadata.participants || []
            
            // Identifica gli admin
            let admins = participants.filter(p => p.admin !== null || p.isAdmin || p.isSuperAdmin)
            let adminJids = admins.map(p => jidNormalizedUser(p.id))
            
            // Controlla se il bot è admin
            let botIsAdmin = adminJids.includes(jidNormalizedUser(conn.user.id))
            
            let totalMem = participants.length
            let adminCount = admins.length
            let userCount = totalMem - adminCount
            
            totalUsers += totalMem

            report += `📌 *${metadata.subject || 'Senza Nome'}*\n`
            report += `🆔 \`${jid}\`\n`
            report += `👥 Membri: *${totalMem}*\n`
            report += `👮 Admin: *${adminCount}* | 👤 Utenti: *${userCount}*\n`
            report += `🤖 Bot Admin: ${botIsAdmin ? '✅' : '❌'}\n`
            report += `─┈\n`
        }

        report += `\n*✅ OPERAZIONE COMPLETATA*\n`
        report += `📦 Gruppi ricaricati: *${totalGroups}*\n`
        report += `👤 Utenti totali mappati: *${totalUsers}*`

        // Se il report è troppo lungo per un solo messaggio, lo inviamo come file o lo tagliamo
        if (report.length > 4000) {
            await conn.sendMessage(m.chat, { document: Buffer.from(report), mimetype: 'text/plain', fileName: 'reload_report.txt' }, { quoted: m })
        } else {
            await conn.sendMessage(m.chat, { text: report }, { quoted: m })
        }

    } catch (e) {
        console.error(e)
        m.reply(`\`❌\` _Errore durante il ricaricamento:_ \n${e.message}`)
    }
}

handler.command = ['reloadall']
handler.owner = true

export default handler