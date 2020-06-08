const puppeteer = require('puppeteer');
const { Telegraf } = require('telegraf');
require('dotenv').config();
const fs = require('fs');

const refreshTimeInSeconds = 2 * 60;
const numberOfMonthToCheck = 3;

const saveChats = (chats) => {
  fs.writeFile('chats.json', JSON.stringify(chats), function (err) {
    if (err) throw err;
    console.log('Chats have been saved succesfully.');
  }); 
}

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox']});//{headless: false});

  let chats = []
  // load chats from chats.json file
  try {
    chats = JSON.parse(fs.readFileSync('chats.json'));
    console.log(chats);
  } catch {
    console.log("No saved chats.");
  }

  const bot = new Telegraf(process.env.BOT_TOKEN)
  bot.start(async (ctx) => {
    ctx.reply("Willkommen beim Barberini Ticket Warnservice. Ich sende dir eine Nachricht sobald neue Tickets verfügbar sind!");
    let chat = await ctx.getChat();
    chat.lastMessage = "",
    chats.push(chat);
    console.log('added chat: ', chat);

    saveChats(chats);
  })
  bot.hears('hi', (ctx) => ctx.reply('Hey there'))
  bot.launch()

  checkForTickets = async ()=> {
    console.log("Checking for Tickets...")
    const page = await browser.newPage();
    await page.goto('https://shop.museum-barberini.com/#/tickets');
    await page.setDefaultNavigationTimeout(0);

    const availableDates = [];

    const clickNextMonth = async () => {
      await page.click('.barberini-tickets .day-selection .uib-right');
    };

    let monthIndex = 0;

    page.on('response', async response => {
      if (response.url().includes("/tickets/calendar")) {
        response.text().then(async (text) => {
          
          const responseObj = JSON.parse(text).data;
  
          Object.keys(responseObj).forEach(function(date) {
            var ticketsAvailable = responseObj[date];
  
            if(!!ticketsAvailable){
              availableDates.push(date);
            }
          });

          if(monthIndex < numberOfMonthToCheck){
            monthIndex++;
            await clickNextMonth();
          }
          
          if (monthIndex === numberOfMonthToCheck){
            let newMessage = `
Es gibt jetzt wieder Tickets für folgende Tage: ${availableDates}.
Klicke hier um Tickets zu buchen: https://shop.museum-barberini.com/#/tickets`;
      
            if(availableDates.length > 0){
              const idsSent = [];
              chats.forEach(({lastMessage, id}, chatIndex) => {
                if(newMessage !== lastMessage){
                  idsSent.push(id);
                  bot.telegram.sendMessage(id, newMessage);
                  chats[chatIndex].lastMessage = newMessage;
                }
              })

              if (idsSent.length > 0){

                saveChats(chats);
                console.log(`
Sending Message: 
'${newMessage}' 
To chat ids: ${idsSent}
                `);
              }
              
            }

            page.close();
          }
  
        }).catch((e)=>{
          // silently fail
        });
      }
    });
  }

  const refreshData = async() => {
      await checkForTickets();

      setTimeout(refreshData, refreshTimeInSeconds*1000);
  }

  refreshData()
})();

