import fs from 'fs'

const transactionPath = './media/transazioni.json'

const loadTransactions = () => {
    try {
        if (!fs.existsSync(transactionPath)) return []
        return JSON.parse(fs.readFileSync(transactionPath, 'utf-8'))
    } catch {
        return []
    }
}

const saveTransaction = (jid, amount, type) => {
    let logs = loadTransactions()
    const newLog = {
        jid,
        amount,
        type,
        timestamp: Date.now(),
        date: new Date().toLocaleString('it-IT')
    }
    logs.push(newLog)
    fs.writeFileSync(transactionPath, JSON.stringify(logs, null, 2))
}

let handler = m => m

handler.before = async function (m, { conn }) {
    if (!m.sender || m.key.fromMe) return !0

    let user = global.db.data.users[m.sender]
    if (!user || !user.messages) return !0

    const threshold = 120
    const reward = 450

    if (user.messages > 0 && user.messages % threshold === 0) {
        user.money = (user.money || 0) + reward
        
        saveTransaction(m.sender, reward, 'PREMIO_MESSAGGI')
        
        let testo = `@${m.sender.split('@')[0]} hai raggiunto  *${user.messages}* messaggi!\nTi sono stati accreditati *${reward}€* sul saldo. 🎉`

        await conn.sendMessage(m.chat, {
            text: testo,
            mentions: [m.sender]
        }, { quoted: m })
    }

    return !0
}

export default handler