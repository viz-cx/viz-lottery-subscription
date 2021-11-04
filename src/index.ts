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
        console.log(`Latest block ${latestBlock}. Checking next block ${nextBlock}`)
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
            let activeSubscribers = (await viz.getPaidSubscriptionOptions(accountName))['active_subscribers']
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
            let result = await viz.pay(winner, balance)
            console.log(result)
            currentBlock.save(nextBlock)
            // TODO: send post to FSP
        }
    } catch(err) {
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

setInterval(runApp, 1000 * 10)
