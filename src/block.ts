import { readFileSync, WriteFileOptions, writeFileSync } from 'fs'

export class CurrentBlock {
    private fileName = `${__dirname}/../data/.block`
    private options: WriteFileOptions = { encoding: 'utf-8' }

    public save(block: number) {
        writeFileSync(this.fileName, block.toString(), this.options)
    }

    public load(): number {
        let block = readFileSync(this.fileName, this.options)
        return parseInt(block.toString())
    }
}
