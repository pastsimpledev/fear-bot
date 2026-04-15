import { jidNormalizedUser } from "@realvare/baileys";

let handler = async (m, { conn }) => {
    let users = global.db.data.users;
    let sender = m.sender;

    if (!users[sender].lastrob) users[sender].lastrob = 0;
    let cd = 10000;
    let remaining = cd - (new Date() - users[sender].lastrob);
    
    if (remaining > 0) return m.reply(`\`𐔌⏳꒱\` _*Attendi ${Math.ceil(remaining / 1000)} secondi prima di rubare ancora.*_`);

    let allUsers = Object.keys(users);
    
    let targets = allUsers.filter(jid => 
        jid !== sender && 
        (users[jid].money > 100 || users[jid].bank > 100)
    );

    if (targets.length === 0) return m.reply('`𐔌💸꒱` _*Non c\'è nessuno nel database abbastanza ricco da essere rubato.*_');

    let victim = targets[Math.floor(Math.random() * targets.length)];
    let victimData = users[victim];

    let amount = Math.floor(Math.random() * (500 - 50 + 1)) + 50;
    let chance = Math.random() * 100;
    let fromBank = chance > 98; 
    let type = fromBank ? 'bank' : 'money';

    let finalAmount = Math.min(amount, (victimData[type] || 0));
    if (finalAmount <= 0) return m.reply('`𐔌💸꒱` _*Il colpo è fallito.*_');

    victimData[type] -= finalAmount;
    users[sender].money = (users[sender].money || 0) + finalAmount;
    users[sender].lastrob = new Date() * 1;

    let successMsg = `\`𐔌💰꒱\` _*Colpo riuscito (Globale)!*_\n\n` +
                     `> Hai rubato *${finalAmount}* monete a @${victim.split('@')[0]} dalla sua ${fromBank ? 'Banca 🏦' : 'Tasche 👜'}.`;
    
    await conn.sendMessage(m.chat, { text: successMsg, mentions: [victim] }, { quoted: m });
};

handler.command = ['ruba'];
handler.group = true;

export default handler;