import axios from 'axios'

const BROWSERLESS_KEY = global.APIKeys?.browserless
const weatherApiUrl = 'https://api.popcat.xyz/v2/weather?q='

const getWeatherIconHtml = (skyText) => {
    const s = skyText.toLowerCase()
    if (s.includes('sun') || s.includes('clear')) {
        return `<div class="icon sun"><div class="rays"></div></div>`
    }
    if (s.includes('thunder') || s.includes('storm')) {
        return `<div class="icon thunderCloud"><div class="cloud"></div><div class="lightning"><div class="bolt"></div><div class="bolt"></div></div></div>`
    }
    if (s.includes('snow')) {
        return `<div class="icon flaky"><div class="cloud"></div><div class="snow"><div class="flake"></div><div class="flake"></div></div></div>`
    }
    if (s.includes('rain') || s.includes('shower') || s.includes('drizzle')) {
        return `<div class="icon rainy"><div class="cloud"></div><div class="rain"></div></div>`
    }
    if (s.includes('fog') || s.includes('mist') || s.includes('haze')) {
        return `<div class="icon misty"><div class="cloud"></div><div class="mist"></div></div>`
    }
    if (s.includes('cloud')) {
        return `<div class="icon cloudy"><div class="cloud"></div><div class="cloud"></div></div>`
    }
    return `<div class="icon unknown">?</div>`
}

const getWeatherBg = (skyText) => {
    const s = skyText.toLowerCase()
    if (s.includes('sun') || s.includes('clear')) return 'https://i.ibb.co/68v8z4z/sun.jpg'
    if (s.includes('cloud')) return 'https://i.ibb.co/3Wq8p9M/clouds.jpg'
    if (s.includes('rain') || s.includes('shower')) return 'https://i.ibb.co/5G3p8hL/rain.jpg'
    if (s.includes('thunder')) return 'https://i.ibb.co/9V9p1sN/thunder.jpg'
    if (s.includes('snow')) return 'https://i.ibb.co/0V8q10M/snow.jpg'
    if (s.includes('fog')) return 'https://i.ibb.co/8b7v10N/fog.jpg'
    return 'https://i.ibb.co/6fs5B1V/triplo3.jpg'
}

const traduceDay = (d) => {
    const days = { 'Mon': 'Lun', 'Tue': 'Mar', 'Wed': 'Mer', 'Thu': 'Gio', 'Fri': 'Ven', 'Sat': 'Sab', 'Sun': 'Dom', 'Monday': 'Lunedì', 'Tuesday': 'Martedì', 'Wednesday': 'Mercoledì', 'Thursday': 'Giovedì', 'Friday': 'Venerdì', 'Saturday': 'Sabato', 'Sunday': 'Domenica' }
    return days[d] || d
}

const traduceSky = (s) => {
    const sky = {
        'Clear': 'Sereno', 'Sunny': 'Soleggiato', 'Mostly sunny': 'Preval. soleggiato',
        'Partly sunny': 'Parzialm. soleggiato', 'Cloudy': 'Nuvoloso', 'Mostly cloudy': 'Molto nuvoloso',
        'Partly cloudy': 'Parzialm. nuvoloso', 'Rain': 'Pioggia', 'Light rain': 'Pioggia leggera',
        'Showers': 'Rovesci', 'Thunderstorm': 'Temporale', 'Fog': 'Nebbia', 'Snow': 'Neve', 'Rain showers': 'Pioggia'
    }
    return sky[s] || s
}

const handler = async (m, { conn, text, usedPrefix }) => {
    if (!text) return m.reply(`\`𐔌⚠️ ꒱\` Inserisci una città.`)
    if (!BROWSERLESS_KEY) return m.reply('\`𐔌⚠️ ꒱\` Browserless Key non configurata.')

    try {
        await conn.sendPresenceUpdate('composing', m.chat)

        const res = await axios.get(weatherApiUrl + encodeURIComponent(text)).catch(e => e.response)
        if (!res || res.status !== 200 || !res.data || res.data.error) {
            return m.reply(`\`𐔌⚠️ ꒱\` Località non trovata.`)
        }

        const w = res.data.message[0]
        const current = w.current
        const forecast = w.forecast ? w.forecast.slice(1, 3) : []
        const weatherBg = getWeatherBg(current.skytext)
        const currentIconHtml = getWeatherIconHtml(current.skytext)

        const html = `<html><head><style>
            @import url('https://fonts.googleapis.com/css2?family=Figtree:wght@400;600;800&display=swap');
            body { margin: 0; padding: 0; width: 500px; height: 800px; display: flex; align-items: center; justify-content: center; font-family: 'Figtree', sans-serif; background: #000; overflow: hidden; color: white; }
            .background { position: absolute; width: 100%; height: 100%; background: url('${weatherBg}') center/cover; filter: blur(50px) brightness(0.3); transform: scale(1.1); }
            .glass-card { position: relative; width: 420px; height: 720px; background: rgba(255, 255, 255, 0.04); backdrop-filter: blur(25px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 40px; padding: 35px; box-sizing: border-box; display: flex; flex-direction: column; box-shadow: 0 30px 60px rgba(0,0,0,0.5); }
            
            .header { text-align: left; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 15px; margin-bottom: 20px;}
            .location-name { font-size: 22px; font-weight: 800; color: white; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .date-info { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 600; margin-top: 4px; text-transform: uppercase; letter-spacing: 1px;}

            .main-info { flex-grow: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
            .icon-container { margin-bottom: 10px; transform: scale(0.9); }
            .temp-large { font-size: 100px; font-weight: 800; color: white; line-height: 0.9; position: relative; letter-spacing: -4px; }
            .temp-large::after { content: '°'; position: absolute; top: 10px; right: -25px; font-size: 45px; font-weight: 600; color: rgba(255,255,255,0.7); }
            .sky-text { font-size: 22px; font-weight: 600; color: white; margin-top: 10px; text-transform: capitalize; }
            .feels-like { font-size: 13px; color: rgba(255,255,255,0.5); font-weight: 400; margin-top: 5px; }

            .stats-area { width: 100%; display: flex; justify-content: space-around; background: rgba(255, 255, 255, 0.02); border-radius: 20px; padding: 15px; box-sizing: border-box; margin-top: 25px; border: 1px solid rgba(255,255,255,0.04);}
            .stat-box { text-align: center; }
            .stat-label { font-size: 10px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: rgba(255,255,255,0.4); margin-bottom: 4px; }
            .stat-val { font-size: 18px; font-weight: 700; color: white; }

            .forecast-area { width: 100%; margin-top: 25px; border-top: 1px solid rgba(255,255,255,0.08); padding-top: 20px;}
            .forecast-row { display: flex; justify-content: space-between; align-items: center; padding: 12px 0; color: rgba(255,255,255,0.8); border-bottom: 1px solid rgba(255,255,255,0.02);}
            .forecast-row:last-child { border-bottom: none; }
            .f-day { font-size: 16px; font-weight: 600; width: 50px; color: white; }
            .f-icon-sm { width: 30px; text-align: center; transform: scale(0.45); margin-left: -5px;}
            .f-temps { font-size: 16px; font-weight: 700; color: white; width: 90px; text-align: center; }
            .f-sky { font-size: 13px; font-weight: 400; text-align: right; opacity: 0.6; flex-grow: 1; max-width: 120px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;}

            .icon { position: relative; display: inline-block; width: 80px; height: 80px; } 
            .cloud { position: absolute; z-index: 1; top: 50%; left: 50%; width: 45px; height: 45px; margin: -22px; background: currentColor; border-radius: 50%; box-shadow: -25px 8px 0 -8px, 25px 8px 0 -8px, 0 20px 0 -8px, -12px 20px 0 -8px, 12px 20px 0 -8px; color: #fff; }
            .cloud:after { content: ''; position: absolute; bottom: 0; left: -8px; display: block; width: 60px; height: 22px; background: currentColor; border-radius: 22px; }
            .sun { color: #FFD700; animation: sunRays 20s linear infinite; }
            .sun .rays { position: absolute; top: 50%; left: 50%; width: 30px; height: 30px; margin: -15px; background: currentColor; border-radius: 50%; box-shadow: 0 0 30px 8px, 0 -45px 0 -12px, 0 45px 0 -12px, -45px 0 0 -12px, 45px 0 0 -12px, -32px -32px 0 -12px, 32px 32px 0 -12px, -32px 32px 0 -12px, 32px -32px 0 -12px; }
            @keyframes sunRays { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
            .cloudy .cloud { color: #fff; }
            .cloudy .cloud:nth-child(2) { color: #b3b3b3; transform: scale(0.8) translate(-30%, 20%); z-index: 0; }
            .rainy .cloud { color: #b3b3b3; }
            .rainy .rain { position: absolute; z-index: 2; top: 60%; left: 50%; width: 30px; height: 30px; margin: 0 -15px; }
            .rainy .rain:after { content: ''; position: absolute; top: 8px; left: 50%; display: block; width: 3px; height: 12px; margin-left: -1px; background: #0cf; border-radius: 2px; animation: rainDrop 1.5s linear infinite; box-shadow: 8px 4px 0 #0cf, -8px 4px 0 #0cf; opacity: 0.8; }
            @keyframes rainDrop { 0% { transform: translate(0,-8px) scaleY(1); opacity: 0; } 50% { transform: translate(1px,8px) scaleY(1); opacity: 1; } 100% { transform: translate(2px,24px) scaleY(0.1); opacity: 0; } }
            .flaky .cloud { color: #fff; }
            .flaky .snow { position: absolute; z-index: 2; top: 65%; left: 50%; width: 30px; height: 30px; margin: 0 -15px; }
            .flaky .flake { position: absolute; top: 0; left: 50%; width: 5px; height: 5px; margin: -2px; background: #fff; border-radius: 50%; animation: snowFall 2s linear infinite; opacity: 0; }
            @keyframes snowFall { 0% { transform: translate(0,-8px); opacity: 0; } 20% { opacity: 1; } 80% { transform: translate(8px,24px); opacity: 1; } 100% { transform: translate(12px,32px); opacity: 0; } }
            .thunderCloud .cloud { color: #555; }
            .thunderCloud .lightning { position: absolute; z-index: 2; top: 65%; left: 50%; width: 30px; height: 30px; margin: 0 -15px; opacity: 0; animation: lightningFlash 3s step-end infinite; }
            .thunderCloud .bolt { position: absolute; top: 0; left: 50%; width: 3px; height: 16px; margin: -8px -1px; background: #FFD700; border-radius: 2px; transform: skewX(-10deg); }
            @keyframes lightningFlash { 0%, 95%, 98% { opacity: 0; } 96%, 99% { opacity: 1; } }
            .misty .cloud { color: #fff; opacity: 0.4; }
            .unknown { font-size: 40px; font-weight: 800; color: rgba(255,255,255,0.1); }
        </style></head><body>
            <div class="background"></div>
            <div class="glass-card">
                <div class="header">
                    <h1 class="location-name">${w.location.name}</h1>
                    <div class="date-info">${traduceDay(current.day)}, ${current.date}</div>
                </div>
                <div class="main-info">
                    <div class="icon-container">${currentIconHtml}</div>
                    <div class="temp-large">${current.temperature}</div>
                    <div class="sky-text">${traduceSky(current.skytext)}</div>
                    <div class="feels-like">Percepita: ${current.feelslike}°${w.location.degreetype}</div>
                </div>
                <div class="stats-area">
                    <div class="stat-box"><div class="stat-label">Umidità</div><div class="stat-val">${current.humidity}%</div></div>
                    <div class="stat-box"><div class="stat-label">Vento</div><div class="stat-val">${current.windspeed}</div></div>
                    <div class="stat-box"><div class="stat-label">Precip.</div><div class="stat-val">${forecast[0]?.precip || '0'}%</div></div>
                </div>
                <div class="forecast-area">
                    ${forecast.map(f => `
                    <div class="forecast-row">
                        <span class="f-day">${traduceDay(f.shortday)}</span>
                        <div class="f-icon-sm">${getWeatherIconHtml(f.skytextday)}</div>
                        <span class="f-temps">${f.high}° / ${f.low}°</span>
                        <span class="f-sky">${traduceSky(f.skytextday)}</span>
                    </div>`).join('')}
                </div>
            </div>
        </body></html>`

        const screenshot = await axios.post(`https://chrome.browserless.io/screenshot?token=${BROWSERLESS_KEY}`, { 
            html, 
            options: { type: 'jpeg', quality: 90 }, 
            viewport: { width: 500, height: 800 }
        }, { responseType: 'arraybuffer' })
        
        await conn.sendMessage(m.chat, { 
            image: Buffer.from(screenshot.data), 
            caption: `\`📍 ꒱\` Meteo: *${w.location.name}*`
        }, { quoted: m })

    } catch (e) { 
        console.error(e)
        return conn.sendMessage(m.chat, { text: '\`𐔌⚠️ ꒱\` Errore caricamento dati.' }, { quoted: m })
    }
}

handler.help = ['meteo <città>']
handler.tags = ['info']
handler.command = /^(weather|meteo)$/i

export default handler