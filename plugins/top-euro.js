import fs from 'fs'
import path from 'path'

const walletPath = path.join(process.cwd(), 'media/wallet.json')

const getWallet = () => {
    if (!fs.existsSync(walletPath)) return {}
    try { return JSON.parse(fs.readFileSync(walletPath, 'utf-8')) } catch { return {} }
}

let handler = async (m, { conn }) => {
    let wallet = getWallet()
    let list = Object.keys(wallet)
        .map(jid => ({
            jid,
            total: (wallet[jid].money || 0) + (wallet[jid].bank || 0)
        }))
        .filter(u => u.total > 0)

    list.sort((a, b) => b.total - a.total)
    let top = list.slice(0, 10)

    if (top.length === 0) return m.reply('`𐔌💰꒱` _*Nessun utente trovato nel wallet.*_')

    let text = `╭┈➤ 『 💰 』 *TOP 10 RICCHI*\n`
    text += top.map((user, i) => {
        let emoji = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '👤'
        return `┆  ${emoji} *${i + 1}.* @${user.jid.split('@')[0]} : *${user.total}€*`
    }).join('\n')
    text += `\n╰┈➤ 『 📦 』 \`annoyed system\``

    await conn.sendMessage(m.chat, { text, mentions: top.map(u => u.jid) }, { quoted: m })
}

handler.command = ['topeuro', 'topmoney', 'lb']
handler.group = true

export default handler