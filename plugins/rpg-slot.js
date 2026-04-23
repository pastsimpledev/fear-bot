import fs from 'fs'
import path from 'path'

const walletPath = path.join(process.cwd(), 'media/wallet.json')

const getWallet = () => {
    if (!fs.existsSync(walletPath)) return {}
    try { return JSON.parse(fs.readFileSync(walletPath, 'utf-8')) } catch { return {} }
}

const saveWallet = (data) => {
    fs.writeFileSync(walletPath, JSON.stringify(data, null, 2))
}

const formatTime = (ms) => {
    let m = Math.floor(ms / 60000)
    let s = Math.floor((ms % 60000) / 1000)
    return `${m > 0 ? m + 'm ' : ''}${s}s`
}

const symbols = ['🍒', '🍋', '🍇', '💎', '7️⃣']
const weights = [40, 30, 20, 9, 1]

const spinReel = () => {
    const totalWeight = weights.reduce((acc, w) => acc + w, 0)
    const random = Math.floor(Math.random() * totalWeight)
    let weightSum = 0
    for (let i = 0; i < symbols.length; i++) {
        weightSum += weights[i]
        if (random < weightSum) return symbols[i]
    }
    return symbols[0]
}

let handler = async (m, { conn, args, usedPrefix, command }) => {
    let wallet = getWallet()
    let users = global.db.data.users
    let sender = m.sender

    if (!wallet[sender]) wallet[sender] = { money: 0, bank: 0 }
    if (!users[sender].lastslot) users[sender].lastslot = 0

    let cd = 10 * 60 * 1000 
    let remaining = cd - (new Date() - users[sender].lastslot)
    if (remaining > 0) return m.reply(`\`𐔌⏳꒱\` _*Attendi ${formatTime(remaining)} prima di giocare ancora.*_`)

    let bet = args[0] === 'all' ? wallet[sender].money : parseInt(args[0])
    if (!bet || isNaN(bet) || bet <= 0) return m.reply(`\`𐔌⚠️꒱\` Uso: ${usedPrefix + command} <cifra/all>`)
    if (bet > wallet[sender].money) return m.reply(`\`𐔌💸꒱\` Saldo insufficiente.`)

    wallet[sender].money -= bet
    users[sender].lastslot = new Date() * 1
    saveWallet(wallet)

    let thumb = Buffer.alloc(0)
    try {
        const res = await fetch('https://emojicdn.elk.sh/🎰?format=png')
        thumb = Buffer.from(await res.arrayBuffer())
    } catch (e) {}

    const fakeQuoted = {
        key: {
            remoteJid: m.chat,
            fromMe: false,
            id: 'SLOT_' + Date.now(),
            participant: sender
        },
        message: {
            locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: "🎰 CASINÒ ANNOYED",
                address: "Slot Machine in corso...",
                jpegThumbnail: thumb
            }
        }
    }

    const payload = {
        text: `🎰 *Giro la slot per @${sender.split('@')[0]}*`,
        mentions: [sender],
        contextInfo: {
            forwardingScore: 999,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
                newsletterJid: global.canale.id,
                newsletterName: global.canale.nome,
                serverMessageId: 1
            }
        }
    }

    let initialMsg = await conn.sendMessage(m.chat, payload, { quoted: fakeQuoted })

    let { key } = await conn.sendMessage(m.chat, { text: `[ 🔄 | 🔄 | 🔄 ]` }, { quoted: initialMsg })
    
    const frames = [
        `[ ${symbols[0]} | 🔄 | 🔄 ]`,
        `[ ${symbols[1]} | ${symbols[2]} | 🔄 ]`,
        `[ ${symbols[3]} | ${symbols[0]} | ${symbols[1]} ]`
    ]

    for (let frame of frames) {
        await new Promise(resolve => setTimeout(resolve, 800))
        await conn.sendMessage(m.chat, { text: frame, edit: key })
    }

    const reels = [spinReel(), spinReel(), spinReel()]
    let multiplier = 0
    let winType = 'PERSO 💀'

    if (reels[0] === reels[1] && reels[1] === reels[2]) {
        multiplier = reels[0] === '7️⃣' ? 10 : 5
        winType = reels[0] === '7️⃣' ? 'JACKPOT 🌟' : 'BIG WIN 💰'
    } else if (reels[0] === reels[1] || reels[1] === reels[2] || reels[0] === reels[2]) {
        multiplier = 1.5
        winType = 'RECUPERO ⚖️'
    }

    const winnings = Math.floor(bet * multiplier)
    if (winnings > 0) {
        wallet = getWallet()
        wallet[sender].money += winnings
        saveWallet(wallet)
    }

    let finalMsg = `╭┈➤ 『 🎰 』 *RISULTATO*
┆  『 🎰 』 [ ${reels[0]} | ${reels[1]} | ${reels[2]} ]
┆  『 📊 』 *ESITO:* ${winType}
┆  『 💰 』 *VINCITA:* ${winnings}€
┆  『 🏦 』 *NUOVO SALDO:* ${wallet[sender].money}€
╰┈➤ 『 📦 』 \`annoyed system\``

    const buttons = [{
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: `🎰 RE-BET (${bet}€)`, id: `${usedPrefix}${command} ${bet}` })
    }]

    const interactiveMsg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    body: { text: finalMsg },
                    footer: { text: "annoyed system" },
                    nativeFlowMessage: { buttons },
                    contextInfo: { 
                        mentionedJid: [sender],
                        ...payload.contextInfo 
                    }
                }
            }
        }
    }

    await new Promise(resolve => setTimeout(resolve, 800))
    return conn.relayMessage(m.chat, interactiveMsg, {})
}

handler.help = ['slot <cifra>', 'slot all']
handler.tags = ['rpg']
handler.command = /^(slot|casino|bet)$/i
handler.group = true

export default handler