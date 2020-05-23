const puppeteer = require('puppeteer');
const { Telegraf } = require('telegraf');
require('dotenv').config();

const refreshTimeInSeconds = 30;

(async () => {
  const browser = await puppeteer.launch();//{headless: false});

  const chatIds = [];
  const bot = new Telegraf(process.env.BOT_TOKEN)
  bot.start(async (ctx) => {
    ctx.reply("Welcome to the Barberini tickets bot. I'll notify you when there are new Tickets available fo you!");
    console.log('ctx: ', ctx);
    const chat = await ctx.getChat();
    chatIds.push(chat.id);
    console.log('added chat id: ', chat.id);
  })
  bot.hears('hi', (ctx) => ctx.reply('Hey there'))
  bot.launch()

  checkForTickets = async ()=> {
    const page = await browser.newPage();
    await page.goto('https://shop.museum-barberini.com/#/tickets');
    
    page.on('response', response => {
      if (response.url().includes("/tickets/calendar")) {
        response.text().then(function (text) {
          
          const responseObj = JSON.parse(text).data;
  
          const availableDates = [];
          Object.keys(responseObj).forEach(function(date) {
            var ticketsAvailable = responseObj[date];
            console.log('ticketsAvailable: ',ticketsAvailable);
            console.log('date: ',date);
  
            if(!!ticketsAvailable){
              availableDates.push(date);
            }
          });
  
          if(availableDates.length > 0){
            chatIds.forEach((chatId) => {
              bot.telegram.sendMessage(chatId, "There are now Tickets available for the following Dates: " + availableDates);
              bot.telegram.sendMessage(chatId, "Just go to https://shop.museum-barberini.com/#/tickets to book your Tickets!");
            })
          }
  
          page.close()
  
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

