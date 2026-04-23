import fs from 'fs'
import path from 'path'
import axios from 'axios'

let handler = async (m, { conn }) => {
    const sender = m.sender

    const walletPath = path.join(process.cwd(), 'media', 'wallet.json')
    const bancaPath = path.join(process.cwd(), 'media', 'banca.json')
    const txPath = path.join(process.cwd(), 'media', 'transazioni.json')

    if (!fs.existsSync(txPath)) fs.writeFileSync(txPath, JSON.stringify({}))

    let walletDb = fs.existsSync(walletPath) ? JSON.parse(fs.readFileSync(walletPath)) : {}
    let bancaDb = fs.existsSync(bancaPath) ? JSON.parse(fs.readFileSync(bancaPath)) : {}
    let txDb = JSON.parse(fs.readFileSync(txPath))

    let userWallet = walletDb[sender] || { money: 0, bank: 0 }
    let userBanca = bancaDb[sender]
    let userTx = txDb[sender] || []

    if (!userBanca || !userBanca.hasCard) {
        return conn.sendMessage(m.chat, { text: '『 ❌ 』 Non possiedi una carta bancaria. Creane una prima.' }, { quoted: m })
    }

    const recentTx = userTx.slice(-7).reverse()
    
    let txHtml = ''
    if (recentTx.length === 0) {
        txHtml = `<div class="tx-item"><div class="tx-info"><div class="tx-title">Nessun movimento</div></div></div>`
    } else {
        recentTx.forEach(tx => {
            let isPlus = false
            if (tx.type === 'entrata' || tx.type === 'prelievo') isPlus = true
            
            let colorClass = isPlus ? 'tx-plus' : 'tx-minus'
            let sign = isPlus ? '+' : '-'
            let amountStr = `${sign}€ ${Math.abs(tx.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`

            let dateObj = new Date(tx.date || Date.now())
            let dateStr = dateObj.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })

            txHtml += `
            <div class="tx-item">
                <div class="tx-info">
                    <div class="tx-title">${tx.description || 'Transazione'}</div>
                    <div class="tx-date">${dateStr}</div>
                </div>
                <div class="tx-amount ${colorClass}">${amountStr}</div>
            </div>
            `
        })
    }

    const fullCardNumber = userBanca.cardNumber || userBanca.number || '0000 0000 0000 0000'
    const last4 = fullCardNumber.slice(-4)
    const cardNumber = `**** **** **** ${last4}`
    const rawBalance = userWallet.bank || 0
    const balance = rawBalance.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const balanceParts = balance.split(',')
    const intPart = balanceParts[0]
    const decPart = balanceParts[1] || '00'

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="it">
    <head>
        <meta charset="UTF-8">
        <style>
            * { box-sizing: border-box; }
            body { 
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; 
                background-color: #f4f5f7; 
                margin: 0; 
                padding: 0; 
                width: 1080px;
                height: 1920px;
            }
            .header { 
                background-color: #004b87; 
                color: #fed000; 
                padding: 80px 40px 140px; 
                text-align: center; 
                font-size: 52px; 
                font-weight: 800; 
                letter-spacing: 2px;
            }
            .card-container {
                margin: -100px 40px 40px;
                position: relative;
                z-index: 10;
            }
            .card { 
                background: linear-gradient(135deg, #fed000 0%, #ffdf33 100%); 
                border-radius: 32px; 
                padding: 50px; 
                box-shadow: 0 20px 40px rgba(0,0,0,0.15); 
                position: relative;
                overflow: hidden;
            }
            .card-title { 
                font-size: 38px; 
                color: #004b87; 
                font-weight: 800; 
                display: flex;
                justify-content: space-between;
            }
            .card-brand {
                font-size: 32px;
                color: #004b87;
                font-style: italic;
            }
            .card-balance { 
                font-size: 82px; 
                color: #004b87; 
                margin: 40px 0; 
                font-weight: 800; 
                letter-spacing: -2px;
            }
            .card-balance span { font-size: 40px; vertical-align: super; }
            .card-number { 
                font-size: 34px; 
                color: #111; 
                letter-spacing: 6px; 
                font-family: monospace;
            }
            .main-content {
                background: #ffffff;
                border-radius: 40px 40px 0 0;
                padding: 60px 50px;
                min-height: 1200px;
                margin-top: -20px;
            }
            .section-title { 
                font-size: 42px; 
                color: #1a1a1a; 
                font-weight: 800; 
                margin-bottom: 40px; 
            }
            .tx-item { 
                display: flex; 
                justify-content: space-between; 
                align-items: center; 
                padding: 40px 0; 
                border-bottom: 2px solid #f0f0f0; 
            }
            .tx-info { 
                display: flex; 
                flex-direction: column; 
            }
            .tx-title { 
                font-size: 36px; 
                font-weight: 700; 
                color: #1a1a1a; 
                text-transform: capitalize;
            }
            .tx-date { 
                font-size: 28px; 
                color: #888; 
                margin-top: 15px; 
            }
            .tx-amount { 
                font-size: 42px; 
                font-weight: 800; 
            }
            .tx-plus { color: #00a86b; }
            .tx-minus { color: #1a1a1a; }
            .watermark {
                text-align: center;
                color: #ccc;
                font-size: 24px;
                margin-top: 50px;
                font-weight: bold;
            }
        </style>
    </head>
    <body>
        <div class="header">Postepay</div>
        <div class="card-container">
            <div class="card">
                <div class="card-title">
                    <span>Evolution</span>
                    <span class="card-brand">${userBanca.brand || 'VISA'}</span>
                </div>
                <div class="card-balance">€ ${intPart}<span>,${decPart}</span></div>
                <div class="card-number">${cardNumber}</div>
            </div>
        </div>
        <div class="main-content">
            <div class="section-title">Ultimi Movimenti</div>
            ${txHtml}
            <div class="watermark">ZYK SYSTEM</div>
        </div>
    </body>
    </html>
    `

    try {
        await conn.sendMessage(m.chat, { react: { text: '🔄', key: m.key } })

        const response = await axios.post(`https://chrome.browserless.io/screenshot?token=${global.APIKeys.browserless}`, {
            html: htmlContent,
            options: {
                type: 'jpeg',
                quality: 100
            },
            viewport: {
                width: 1080,
                height: 1920,
                deviceScaleFactor: 2
            }
        }, { 
            responseType: 'arraybuffer' 
        })

        const imageBuffer = Buffer.from(response.data)

        await conn.sendMessage(m.chat, { 
            image: imageBuffer, 
            caption: ``,
            ...(global.newsletter ? global.newsletter() : {})
        }, { quoted: m })

        await conn.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
    } catch (e) {
        await conn.sendMessage(m.chat, { react: { text: '❌', key: m.key } })
        await conn.sendMessage(m.chat, { text: `『 ❌ 』 Errore durante la generazione dell'immagine.` }, { quoted: m })
    }
}

handler.help = ['transazioni', 'history']
handler.tags = ['economy']
handler.command = /^(transazioni|history)$/i

export default handler