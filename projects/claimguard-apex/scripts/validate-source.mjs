import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { ApexParserFactory, ApexErrorListener } from '@apexdevtools/apex-parser';
import { transformSync } from '@lwc/compiler';

function files(dir) {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
let errors = 0;
let apexCount = 0;
let lwcCount = 0;
class Listener extends ApexErrorListener {
    constructor(file) { super(); this.file = file; }
    apexSyntaxError(line, column, message) {
        errors++;
        console.error(`${this.file}:${line}:${column} ${message}`);
    }
}
for (const file of [...files('force-app'), ...files('scripts')]) {
    if (/\.(cls|trigger|apex)$/.test(file)) {
        const { parser } = ApexParserFactory.createLexerAndParser(readFileSync(file, 'utf8'), new Listener(file));
        if (file.endsWith('.trigger')) parser.triggerUnit();
        else if (file.endsWith('.apex')) parser.anonymousUnit();
        else parser.compilationUnit();
        apexCount++;
    } else if (file.includes('/lwc/') && /\.(js|html|css)$/.test(file)) {
        try {
            transformSync(readFileSync(file, 'utf8'), relative('force-app/main/default/lwc/claimGuardConsole', file), {
                name: 'claimGuardConsole', namespace: 'c', apiVersion: 62
            });
        } catch (error) { errors++; console.error(`${file}: ${error.message}`); }
        lwcCount++;
    }
}
console.log(`Apex grammar: ${apexCount} source files. LWC compilation: ${lwcCount} files. Errors: ${errors}.`);
console.log('This checks grammar and LWC compilation, not Salesforce Apex semantic compilation, org behavior, coverage or security test outcomes.');
if (errors) process.exit(1);
