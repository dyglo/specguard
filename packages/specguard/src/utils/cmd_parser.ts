/**
 * Simple command parser that respects quoted arguments.
 * Does NOT support shell operators (|, &&, >, etc).
 */
export function parseCommand(command: string): { cmd: string, args: string[] } {
    const args: string[] = [];
    let current = '';
    let quoteChar: string | null = null;
    let escaped = false;

    for (let i = 0; i < command.length; i++) {
        const char = command[i];

        if (escaped) {
            current += char;
            escaped = false;
            continue;
        }

        if (char === '\\') {
            escaped = true;
            continue;
        }

        if (quoteChar) {
            if (char === quoteChar) {
                quoteChar = null;
            } else {
                current += char;
            }
        } else {
            if (char === '"' || char === "'") {
                quoteChar = char;
            } else if (/\s/.test(char)) {
                if (current.length > 0) {
                    args.push(current);
                    current = '';
                }
            } else {
                current += char;
            }
        }
    }

    if (current.length > 0) {
        args.push(current);
    }

    if (args.length === 0) {
        return { cmd: '', args: [] };
    }

    return {
        cmd: args[0],
        args: args.slice(1)
    };
}
