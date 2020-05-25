const puppeteer = require('puppeteer');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const refreshTimeInSeconds = 2 * 60;
const numberOfMonthToCheck = 3;

(async () => {
  const browser = await puppeteer.launch({args: ['--no-sandbox']});//{headless: false});

  const chats = process.env.CHATS.split(',').map(id => {return {lastMessage: "",  chatId: id}});
  const bot = new Telegraf(process.env.BOT_TOKEN)
  bot.start(async (ctx) => {
    ctx.reply("Willkommen beim Barberini Ticket Warnservice. Ich sende dir eine Nachricht sobald neue Tickets verfügbar sind!");
    const chat = await ctx.getChat();
    chats.push({lastMessage: "", chatId: chat.id});
    console.log('added chat: ', chat);
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
              chats.forEach(({lastMessage, chatId}, chatIndex) => {
                if(newMessage !== lastMessage){
                  idsSent.push(chatId);
                  bot.telegram.sendMessage(chatId, newMessage);
                  chats[chatIndex].lastMessage = newMessage;
                }
              })

              if (idsSent.length > 0){
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

