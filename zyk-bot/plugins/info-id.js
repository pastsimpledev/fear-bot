let handler = async (m, { conn }) => {
    const botId = conn.user.id.split(':')[0] + '@s.whatsapp.net'
    const userId = m.sender
    const groupId = m.chat

    let text = `╭┈  『 🆔 』 \`info id\`\n`
    text += `┆  『 🤖 』 \`bot\` ─ ${botId}\n`
    text += `┆  『 👤 』 \`utente\` ─ ${userId}\n`
    
    if (m.isGroup) {
        text += `┆  『 👥 』 \`gruppo\` ─ ${groupId}\n`
    }
    
    text += `╰┈➤ 『 📦 』 \`zykbot system\``

    await conn.sendMessage(m.chat, { 
        text: text,
        ...(global.newsletter ? global.newsletter() : {})
    }, { quoted: m })
}

handler.help = ['id']
handler.tags = ['info']
handler.command = /^(id)$/i

export default handler