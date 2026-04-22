import fs from 'fs'
import path from 'path'
import { jidNormalizedUser } from "@realvare/baileys"

const walletPath = path.join(process.cwd(), 'media/wallet.json')

const getWallet = () => {
    if (!fs.existsSync(walletPath)) return {}
    try { return JSON.parse(fs.readFileSync(walletPath, 'utf-8')) } catch { return {} }
}

const saveWallet = (data) => {
    fs.writeFileSync(walletPath, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn }) => {
    let wallet = getWallet()
    let users = global.db.data.users 
    let sender = m.sender

    if (!users[sender].lastrob) users[sender].lastrob = 0
    
    let cd = 10 * 60 * 1000
    let remaining = cd - (new Date() - users[sender].lastrob)
    
    if (remaining > 0) {
        let mins = Math.floor(remaining / 60000)
        let secs = Math.ceil((remaining % 60000) / 1000)
        return m.reply(`\`𐔌⏳꒱\` _*Attendi ${mins}m e ${secs}s prima di rubare ancora.*_`)
    }

    let allWalletUsers = Object.keys(wallet).filter(jid => jid !== sender)
    
    let targets = allWalletUsers.filter(jid => 
        ((wallet[jid].money || 0) > 100 || (wallet[jid].bank || 0) > 100)
    )

    if (targets.length === 0) return m.reply('`𐔌💸꒱` _*Non c\'è nessuno abbastanza ricco da essere derubato nel wallet.*_')

    let victim = targets[Math.floor(Math.random() * targets.length)]
    let victimData = wallet[victim]

    let amount = Math.floor(Math.random() * (500 - 50 + 1)) + 50
    let chance = Math.random() * 100
    
    let fromBank = chance > 98 
    let type = fromBank ? 'bank' : 'money'

    let finalAmount = Math.min(amount, (victimData[type] || 0))
    
    if (finalAmount <= 0) {
        type = 'money'
        finalAmount = Math.min(amount, (victimData[type] || 0))
        if (finalAmount <= 0) return m.reply('`𐔌💸꒱` _*Il colpo è fallito, la vittima è povera.*_')
        fromBank = false
    }

    if (!wallet[sender]) wallet[sender] = { money: 0, bank: 0 }
    
    victimData[type] -= finalAmount
    wallet[sender].money = (wallet[sender].money || 0) + finalAmount
    saveWallet(wallet)

    users[sender].lastrob = new Date() * 1

    let successMsg = `\`𐔌💰꒱\` _*Colpo riuscito!*_\n\n` +
                     `> Hai rubato *${finalAmount}€* a @${victim.split('@')[0]} dalla sua ${fromBank ? 'Banca 🏛️' : 'Tasca 👛'}.`
    
    await conn.sendMessage(m.chat, { text: successMsg, mentions: [victim] }, { quoted: m })
}

handler.help = ['ruba']
handler.tags = ['rpg']
handler.command = ['ruba', 'rob']
handler.group = true

export default handler