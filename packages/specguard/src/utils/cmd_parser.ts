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

    // Requirement: Ensure no empty string arguments
    const filteredArgs = args.filter(arg => arg.length > 0);

    if (filteredArgs.length === 0) {
        throw new Error(`Invalid tool command: "${command}"`);
    }

    return {
        cmd: filteredArgs[0],
        args: filteredArgs.slice(1)
    };
}
