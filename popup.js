// utilities to make a popup window for warious types of outputs (string, number, enum, datetime, etc.)

function popup(title, message, inputSpec, valueSelector, callback) {
    var popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = '<h2>' + title + '</h2><p>' + message + '</p>' + inputSpec + '<br><button id="btnok">OK</button>';
    document.body.appendChild(popup);
    popup.querySelector('#btnok').addEventListener('click', function() {
        callback(valueSelector(popup));
        document.body.removeChild(popup);
    });
    return popup;
}


// create a popup window for a string input
export function popupString(title, message, input, callback) {
    popup(title, message, '<input type="text" value="' + input + '">', (popup) => popup.querySelector('input').value, callback);
}

// create a popup window for a number input
export function popupNumber(title, message, input, callback) {
    popup(title, message, '<input type="number" value="' + input + '">', (popup) => parseFloat(popup.querySelector('input').value), callback);
}

// create a popup window for a enum input
export function popupEnum(title, message, values, input, callback) {
    popup(title, message, '<select>' + values.map(v => '<option value="' + v + '"' + (v === input ? ' selected' : '') + '>' + v + '</option>').join('') + '</select>', (popup) => popup.querySelector('select').value, callback);
}

// create a popup window for a datetime input
export function popupDatetime(title, message, input, callback) {
    const timeString = new Date(input.getTime() - input.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
    const p = popup(title, message, '<input type="datetime-local" value="' + timeString + '"><button id="btnnow">Now</button>', (popup) => new Date(popup.querySelector('input').value), callback);

    p.querySelector('#btnnow').addEventListener('click', function() {
        callback(new Date());
        document.body.removeChild(p);
    });
}

// create a popup window for a boolean input
export function popupBoolean(title, message, input, callback) {
    popup(title, message, '<input type="checkbox"' + (input ? ' checked' : '') + '><br>', (popup) => popup.querySelector('input').checked, callback);
}

// create a popup window for a file input
export function popupFile(title, message, callback) {
    popup(title, message, '<input type="file">', (popup) => popup.querySelector('input').files[0], callback);
}

// create a popup window for a color input
export function popupColor(title, message, input, callback) {
    popup(title, message, '<input type="color" value="' + input + '">', (popup) => popup.querySelector('input').value, callback);
}