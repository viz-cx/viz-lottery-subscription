import { VIZ } from './viz'
import { CurrentBlock } from './block'
import * as dotenv from 'dotenv'
dotenv.config({ path: `${__dirname}/../.env` })

async function runApp() {
    let viz = new VIZ()
    try {
        let currentBlock = new CurrentBlock()
        let blocksPerDay = 60 * 60 * 24 / 3
        let nextBlock = currentBlock.load() + blocksPerDay
        let latestBlock = (await viz.getDynamicGlobalProperties())['last_irreversible_block_num']
        console.log(`Checking next block ${nextBlock}. ${nextBlock-latestBlock} blocks left`)
        if (latestBlock > nextBlock + blocksPerDay) {
            console.log('Too much offline, moving to the future')
            currentBlock.save(nextBlock)
            return
        }
        let block = await viz.getBlockHeader(nextBlock)
        if (block) {
            let accountName = process.env.ACCOUNT
            let account = await viz.getAccount(accountName)
            let balance = parseFloat(account['balance'])
            let subscriptionOptions = await viz.getPaidSubscriptionOptions(accountName)
            let activeSubscribers = subscriptionOptions['active_subscribers']
            let subscriptionAmount = parseFloat(subscriptionOptions['amount']) / 1000
            let statuses = await Promise.all(activeSubscribers.map(subscriber => viz.getPaidSubscriptionStatus(subscriber, accountName)))
            var participants: string[] = []
            for (let status of statuses) {
                let subscriber = status['subscriber']
                let level = status['level']
                participants = participants.concat(Array(level).fill(subscriber))
            }
            let hashSumResult = hashSum(block['previous'] + block['witness'])
            let winnerCode = hashSumResult % participants.length
            let winner = participants[winnerCode]
            console.log('Winner:', winner)
            let doubleSubscriptionSum = participants.length * subscriptionAmount * 2
            let payAmount: number
            if (balance > doubleSubscriptionSum) {
                payAmount = doubleSubscriptionSum
            } else {
                payAmount = balance
            }
            let result = await viz.pay(winner, payAmount)
            console.log(result)
            currentBlock.save(nextBlock)
            // send post to FSP
            let previous = account['custom_sequence_block_num']
            let object = {}
            if (previous > 0) {
                object['p'] = previous
            }
            let users = statuses.map(status => status['subscriber'] + '(' + status['level'] + ')' ).join(', ')
            let text = `🏆 Победитель @${winner} получает ${payAmount.toFixed(2)} VIZ
🤹 Розыгрыш завершился на блоке ${nextBlock}
🤖 Хеш-сумма ${hashSumResult}
🚴 Участники: ${users}`
            console.log(text)
            object['d'] = { 't': text }
            let json = JSON.stringify(object)
            let customResult = await viz.broadcastCustom(json)
            console.log(customResult)
        }
    } catch (err) {
        console.log('Error:', err)
        viz.changeNode()
    }
}

function hashSum(s: string): number {
    return s.split('').reduce(function (a, b) {
        a = ((a << 5) - a) + b.charCodeAt(0)
        return Math.abs(a & a)
    }, 0)
}

setInterval(runApp, 1000 * 60 * 3)
