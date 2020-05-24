A simple telegram bot that sends out messages when there are new Tickets in the Barberini online shop.


To start the Bot in the background and write output to a file:
```
nohup node index.js > output.log &
```

And to kill it:
```
ps -fC node #copy the PID
kill -9 PID #replace PID with the actual PID
```