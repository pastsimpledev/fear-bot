import fs from 'fs'
import path from 'path'

const walletPath = path.join(process.cwd(), 'media/wallet.json')

const getWallet = () => {
    if (!fs.existsSync(walletPath)) return {}
    return JSON.parse(fs.readFileSync(walletPath, 'utf-8'))
}

const saveWallet = (data) => {
    fs.writeFileSync(walletPath, JSON.stringify(data, null, 2))
}

let handler = async (m, { conn, usedPrefix, command, args }) => {
    let wallet = getWallet()
    let sender = m.sender
    
    if (!wallet[sender]) wallet[sender] = { money: 0, bank: 0 }
    
    global.blackjack = global.blackjack || {}
    if (global.blackjack[sender]) return m.reply(`⚠️ Hai già una partita in corso!`)

    let amount = parseInt(args[0])
    if (!amount || isNaN(amount)) return m.reply(`*⚠️ Inserisci la scommessa!*\nEsempio: \`${usedPrefix + command} 200\``)
    if (amount < 150) return m.reply(`*❌ Scommessa minima: 150€*`)
    if (wallet[sender].money < amount) return m.reply(`*💸 Non hai abbastanza contanti!*`)

    const suits = ['♥️', '♦️', '♠️', '♣️']
    const values = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
    const getCard = () => {
        const v = values[Math.floor(Math.random() * values.length)]
        const s = suits[Math.floor(Math.random() * suits.length)]
        return { v, s, val: (isNaN(v) ? (v === 'A' ? 11 : 10) : parseInt(v)) }
    }

    wallet[sender].money -= amount
    saveWallet(wallet)

    global.blackjack[sender] = {
        bet: amount,
        player: [getCard(), getCard()],
        dealer: [getCard(), getCard()],
        chat: m.chat
    }

    return renderBlackjack(m, conn, sender)
}

async function renderBlackjack(m, conn, sender) {
    const game = global.blackjack[sender]
    const calc = (hand) => {
        let total = hand.reduce((a, b) => a + b.val, 0)
        let aces = hand.filter(c => c.v === 'A').length
        while (total > 21 && aces > 0) { total -= 10; aces-- }
        return total
    }

    let pTotal = calc(game.player)
    let isGameOver = pTotal >= 21
    let result = ''

    if (isGameOver) {
        let wallet = getWallet()
        if (pTotal === 21) {
            wallet[sender].money += Math.floor(game.bet * 2.5)
            result = `✨ BLACKJACK! Hai vinto ${Math.floor(game.bet * 2.5)}€!`
        } else {
            result = `💀 SBALLATO! Hai perso ${game.bet}€.`
        }
        saveWallet(wallet)
        delete global.blackjack[sender]
    }

    let caption = `
╭┈➤ 『 🃏 』 *BLACKJACK*
┆  『 👤 』 *GIOCATORE*
┆  👉 Carte: ${game.player.map(c => `[${c.v}${c.s}]`).join(' ')}
┆  🧮 Totale: *${pTotal}*
┆
┆  『 🤖 』 *DEALER*
┆  👉 Carte: [${game.dealer[0].v}${game.dealer[0].s}] [?]
┆
┆  『 💰 』 *PUNTATA:* ${game.bet}€
╰┈➤ ${isGameOver ? `*${result}*` : '`Scegli la tua mossa...`'}`.trim()

    const buttons = [
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "🃏 CARTA", id: `.bj_hit` })
        },
        {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({ display_text: "✋ STAI", id: `.bj_stay` })
        }
    ]

    const msg = {
        viewOnceMessage: {
            message: {
                interactiveMessage: {
                    header: { title: "◯  𐙚  *──  b l a c k j a c k  ──*", hasVideoMessage: false },
                    body: { text: caption },
                    footer: { text: "annoyed system" },
                    nativeFlowMessage: { buttons: isGameOver ? [] : buttons },
                    contextInfo: {
                        mentionedJid: [sender],
                        stanzaId: 'annoyedSystem',
                        participant: '0@s.whatsapp.net',
                        quotedMessage: m.message
                    }
                }
            }
        }
    }

    return await conn.relayMessage(m.chat, msg, {})
}

handler.before = async function (m, { conn }) {
    const sender = m.sender
    if (!global.blackjack?.[sender]) return !0
    
    let id = ''
    if (m.mtype === 'interactiveResponseMessage') {
        id = JSON.parse(m.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson).id
    } else if (m.text?.startsWith('.')) {
        id = m.text
    } else return !0

    if (!['.bj_hit', '.bj_stay'].includes(id)) return !0

    const game = global.blackjack[sender]
    const getCard = () => {
        const v = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'][Math.floor(Math.random() * 13)]
        const s = ['♥️', '♦️', '♠️', '♣️'][Math.floor(Math.random() * 4)]
        return { v, s, val: (isNaN(v) ? (v === 'A' ? 11 : 10) : parseInt(v)) }
    }

    const calc = (hand) => {
        let total = hand.reduce((a, b) => a + b.val, 0)
        let aces = hand.filter(c => c.v === 'A').length
        while (total > 21 && aces > 0) { total -= 10; aces-- }
        return total
    }

    if (id === '.bj_hit') {
        game.player.push(getCard())
        return renderBlackjack(m, conn, sender)
    }

    if (id === '.bj_stay') {
        while (calc(game.dealer) < 17) game.dealer.push(getCard())
        let pTotal = calc(game.player)
        let dTotal = calc(game.dealer)
        let wallet = getWallet()
        let finalMsg = ''

        if (dTotal > 21 || pTotal > dTotal) {
            wallet[sender].money += game.bet * 2
            finalMsg = `✨ *HAI VINTO!* Il dealer ha fatto ${dTotal}. Hai guadagnato ${game.bet * 2}€.`
        } else if (pTotal === dTotal) {
            wallet[sender].money += game.bet
            finalMsg = `⚖️ *PAREGGIO!* Punteggio ${pTotal}. Soldi restituiti.`
        } else {
            finalMsg = `💀 *HAI PERSO!* Il dealer vince con ${dTotal}.`
        }

        saveWallet(wallet)
        delete global.blackjack[sender]
        return conn.sendMessage(m.chat, { text: finalMsg, mentions: [sender] }, { quoted: m })
    }
}

handler.command = ['blackjack', 'bj']
export default handler