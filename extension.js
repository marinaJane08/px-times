var vscode = require('vscode');
function activate(context) {
    var disposable = vscode.commands.registerTextEditorCommand('extension.pxTimes', function (textEditor, textEditorEdit) {
        const config = vscode.workspace.getConfiguration("px-times");
        const time = config.get('time');
        var regexStr = "([0-9]*\\.?[0-9]+)px";
        placeholder(regexStr, (match, value) => `${pxTimes(value, time)}px`, textEditor, textEditorEdit);
    });
    context.subscriptions.push(disposable);
}
exports.activate = activate;

function pxTimes(px, time) {
    if (time == 0) { return 0; }
    const value = Math.round(px * time);
    return value;
}

function placeholder(regexString, replaceFunction, textEditor, textEditorEdit) {
    let regexExp = new RegExp(regexString, "i");
    let regexExpG = new RegExp(regexString, "ig");
    const selections = textEditor.selections;
    if (selections.length == 0 || selections.reduce((acc, val) => acc || val.isEmpty), false) { return; }
    const config = vscode.workspace.getConfiguration("px-times");
    const changesMade = new Map();
    textEditor.edit(builder => {
        let numOcurrences = 0;
        selections.forEach((selection) => {
            for (var index = selection.start.line; index <= selection.end.line; index++) {
                let start = 0, end = textEditor.document.lineAt(index).range.end.character;
                if (index === selection.start.line) {
                    let tmpSelection = selection.with({ end: selection.start });
                    let range = findValueRangeToConvert(tmpSelection, regexString, textEditor);
                    if (range) {
                        start = range.start.character;
                    } else {
                        start = selection.start.character;
                    }
                }
                if (index === selection.end.line) {
                    let tmpSelection = selection.with({ start: selection.end });
                    let range = findValueRangeToConvert(tmpSelection, regexString, textEditor);
                    if (range) {
                        end = range.end.character;
                    } else {
                        end = selection.end.character;
                    }
                }
                let text = textEditor.document.lineAt(index).text.slice(start, end);
                const matches = text.match(regexExpG);
                numOcurrences += matches ? matches.length : 0;
                if (numOcurrences == 0) { continue; }
                const regex = regexExpG;
                const newText = text.replace(regex, replaceFunction);
                const selectionTmp = new vscode.Selection(index, start, index, end);
                const key = `${index}-${start}-${end}`;
                if (!changesMade.has(key)) {
                    changesMade.set(key, true);
                    builder.replace(selectionTmp, newText);
                }
            }
            return;
        }, this);
        if (numOcurrences == 0) {
            vscode.window.showWarningMessage("There were no values to transform");
        }
    })
        .then(success => {
            textEditor.selections.forEach((selection, index, newSelections) => {
                if (selections[index].start.isEqual(selections[index].end)) {
                    const newPosition = selection.end;
                    const newSelection = new vscode.Selection(newPosition, newPosition);
                    textEditor.selections[index] = newSelection;
                }
            });
            textEditor.selections = textEditor.selections;
            if (!success) {
                console.log(`Error: ${success}`);
            }
        });
};

function findValueRangeToConvert(selection, regexString, textEditor) {
    const line = selection.start.line;
    const startChar = selection.start.character;
    const text = textEditor.document.lineAt(line).text;
    const regexExpG = new RegExp(regexString, "ig");

    var result, indices = [];
    while ((result = regexExpG.exec(text))) {
        const resultStart = result.index;
        const resultEnd = result.index + result[0].length;
        if (startChar >= resultStart && startChar <= resultEnd) {
            return new vscode.Range(line, resultStart, line, resultEnd);
        }
    }
    return null;
}
