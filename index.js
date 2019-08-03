require('dotenv').config();
const {exec} = require('child_process');

if (!process.env.DISCORD_TOKEN) {
    trackError(new Error('no token in environment'));
    process.exit(1);
}

const bot = require('@dillonchr/discordbot');

const repeatLetter = (letter, n) => Array(n).fill(letter).join('');
const getSpaces = n => repeatLetter(' ', n);

const MAX_PRINT_LEN = 32;
let TOMORROW_TIMEOUT_ID = -1;
const printTransaction = (cost, desc) => {
    const gap = MAX_PRINT_LEN - (desc.length + cost.length);
    if (gap > 0) {
        return desc + getSpaces(gap) + cost;
    }
    return `${desc}\n${getSpaces(MAX_PRINT_LEN - cost.length)}${cost}`;
};

const print = (chunk) => {
    if (0) {
        console.log(chunk);
        return;
    }
    exec(`echo "${chunk}" > /dev/usb/lp0`, (err, so, se) => {
        if (err) {
            console.error('print error', err);
        }
        if (se) {
            console.error('std err', se);
        }
    });
};

const centerInHorizontalLineBreak = (msg) => {
    const horizontalPadding = (MAX_PRINT_LEN - msg.length) / 2;
    return repeatLetter('=', Math.floor(horizontalPadding)) + msg + repeatLetter('=', Math.ceil(horizontalPadding));
};

const printBalanceTomorrow = (bal) => {
    clearTimeout(TOMORROW_TIMEOUT_ID);
    const now = new Date();
    const tomorrow = new Date();
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0);
    tomorrow.setMinutes(0);
    tomorrow.setSeconds(0);
    const delay = tomorrow.getTime() - now.getTime();
    const statementDate = centerInHorizontalLineBreak(`${now.getMonth() + 1}/${now.getDate()}/${now.getFullYear()}`);
    TOMORROW_TIMEOUT_ID = setTimeout(() => {
        print(`\n\n${statementDate}\n`);
        print(printTransaction(`${bal}`, 'Balance'));
        print(repeatLetter('=', MAX_PRINT_LEN) + repeatLetter('\n', 4));
    }, 5000);
};


bot.hearsAnythingInChannel(process.env.PAYCHECK_CHANNEL_ID, ({reply, content, author}) => {
    const action = content.trim();

    //  if jara and me, print it immediately
    //  if kowalski wait until the next day to print
    if (author.username === 'kowalski') {
        const isBalance = action.match(/: \$([\d.]+)$/);
        if (isBalance) {
            printBalanceTomorrow(isBalance[1]);
        }
    } else {
        try {
            const [cost, desc] = action.split(',').map(s => s.trim());
            if (!isNaN(cost)) {
                print(printTransaction(cost, desc));
            }
        } catch (ignore) {
        }
    }
});

