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

let handler = async (m, { conn, usedPrefix, command, args }) => {
    let wallet = getWallet()
    let users = global.db.data.users
    let sender = m.sender

    if (!wallet[sender]) wallet[sender] = { money: 0, bank: 0 }
    if (!users[sender].lastruota) users[sender].lastruota = 0

    let cd = 10 * 60 * 1000 
    let remaining = cd - (new Date() - users[sender].lastruota)
    if (remaining > 0) return m.reply(`\`𐔌⏳꒱\` _*Attendi ${formatTime(remaining)} prima di girare ancora la ruota.*_`)

    let bet = parseInt(args[0])
    let choice = args[1]?.toLowerCase()

    if (!bet || isNaN(bet) || bet < 150) {
        return m.reply(`\`𐔌⚠️꒱\` Uso: ${usedPrefix + command} <quota> <rosso/nero>`)
    }

    if (!['rosso', 'nero'].includes(choice)) {
        return m.reply(`\`𐔌⚠️꒱\` Scegli tra *rosso* o *nero*.`)
    }

    if (wallet[sender].money < bet) {
        return m.reply('`𐔌💸꒱\` Saldo insufficiente.')
    }

    wallet[sender].money -= bet
    users[sender].lastruota = new Date() * 1
    saveWallet(wallet)

    let thumb = Buffer.alloc(0)
    try {
        const res = await fetch('https://emojicdn.elk.sh/⚙️?format=png')
        thumb = Buffer.from(await res.arrayBuffer())
    } catch (e) {}

    const fakeQuoted = {
        key: {
            remoteJid: m.chat,
            fromMe: false,
            id: 'RUOTA_' + Date.now(),
            participant: sender
        },
        message: {
            locationMessage: {
                degreesLatitude: 0,
                degreesLongitude: 0,
                name: "⚙️ RUOTA DELLA FORTUNA",
                address: "Giro in corso...",
                jpegThumbnail: thumb
            }
        }
    }

    const payload = {
        text: `⚙️ *Puntata accettata!* \nGirando la ruota per @${sender.split('@')[0]}...`,
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

    const frames = [
        '⚪️ 🔴 ⚫️ 🔴 ⚫️ 🔴',
        '⚫️ ⚪️ 🔴 ⚫️ 🔴 ⚫️',
        '🔴 ⚫️ ⚪️ 🔴 ⚫️ 🔴',
        '⚫️ 🔴 ⚫️ ⚪️ 🔴 ⚫️',
        '🔴 ⚫️ 🔴 ⚫️ ⚪️ 🔴'
    ]

    let { key } = await conn.sendMessage(m.chat, { text: `\`🎰\` *RUOTA:* ${frames[0]}` }, { quoted: initialMsg })

    for (let i = 1; i < 5; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000))
        await conn.sendMessage(m.chat, { text: `\`🎰\` *RUOTA:* ${frames[i]}`, edit: key })
    }

    await new Promise(resolve => setTimeout(resolve, 1000))

    const colors = ['rosso', 'nero']
    const result = colors[Math.floor(Math.random() * colors.length)]
    const win = result === choice
    const winAmount = bet * 2

    if (win) {
        wallet = getWallet()
        wallet[sender].money += winAmount
        saveWallet(wallet)
    }

    let finalMsg = `╭┈➤ 『 🎰 』 *RUOTA DELLA FORTUNA*
┆  『 👤 』 *UTENTE:* @${sender.split('@')[0]}
┆  『 🎨 』 *COLORE:* ${result === 'rosso' ? 'ROSSO 🔴' : 'NERO ⚫️'}
┆  『 📉 』 *ESITO:* ${win ? 'HAI VINTO! ✨' : 'HAI PERSO! 💀'}
┆  『 💰 』 *BILANCIO:* ${win ? '+' + winAmount : '-' + bet}€
╰┈➤ 『 📦 』 \`annoyed system\``

    const buttons = [{
        name: "quick_reply",
        buttonParamsJson: JSON.stringify({ display_text: `⚙️ RE-BET (${bet}€)`, id: `${usedPrefix}${command} ${bet} ${choice}` })
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

    return conn.relayMessage(m.chat, interactiveMsg, {})
}

handler.help = ['ruota <bet> <colore>']
handler.tags = ['rpg']
handler.command = /^(ruota)$/i
handler.group = true

export default handler