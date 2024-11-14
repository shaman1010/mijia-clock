import { BTLEDevice } from '../btle_device.js';

const DEVICE_NAME = 'Comet Blue';

const SERVICE_UUID = '47e9ee00-47e9-11e4-8939-164230d1df67';

const CH_TIME = '47e9ee01-47e9-11e4-8939-164230d1df67';  // 0x1a0d040a18   // '<BBBBB'
const CH_DAY = ''; // // '<BBBBBBBB'
const CH_HOLIDAY = ''; // // '<BBBBBBBBb'
const CH_FLAGS = '47e9ee2a-47e9-11e4-8939-164230d1df67'; // 0x000000  // '<BBB'
const CH_TEMPS = '47e9ee2b-47e9-11e4-8939-164230d1df67'; // 0x2a23232200040a // '<bbbbbbb'
const CH_BATT = '47e9ee2c-47e9-11e4-8939-164230d1df67'; // 0x4f
const CH_LCD_TIMER = '47e9ee2e-47e9-11e4-8939-164230d1df67'; // 0x1e00  // '<BB'
const CH_PIN = '47e9ee30-47e9-11e4-8939-164230d1df67';      // _PIN_STRUCT = '<I'

// https://github.com/im-0/cometblue/blob/master/cometblue/device.py
export class CometBlue extends BTLEDevice {

    constructor(device) {
        super(device);
    }

    getName() {
        return 'Silvercrest RT2000';
    }

    _requestFilter() {
        return {name: DEVICE_NAME};
    }

    _requestServices() {
        return [SERVICE_UUID];
    }

    image() {
        return 'silvercrest-rt2000.jpg';
    }

    capabilities() {
        return {
            read: {
                'getTime': {'time': { name: 'Time', type: 'Date'}},
                'getTemperatures': {
                    'currentTemp': { name: 'Current Temperature', type: 'Number', unit: '°C'},
                    'manualTemp': { name: 'Manual Temperature', type: 'Number', unit: '°C'},
                    'targetTempLow': { name: 'Target Temperature Low', type: 'Number', unit: '°C'},
                    'targetTempHigh': { name: 'Target Temperature High', type: 'Number', unit: '°C'},
                    'offsetTemp': { name: 'Offset Temperature', type: 'Number', unit: '°C'},
                    'windowOpenDetection': { name: 'Window Open Detection', type: 'enum', values: ['LOW', 'MID', 'HIGH']},
                    'windowOpenMinutes': { name: 'Window Open Minutes', type: 'Number', unit: 'min'}
                },
                'getBattery': { 'batt': { name: 'Battery', type: 'Number', unit: '%'}},
                'getLCDTimer': { 
                    'preload': { name: 'LCD Timer Preload', type: 'Number', unit: 'min'}, 
                    'current': { name: 'LCD Timer Current', type: 'Number', unit: 'min'}
                }
            },
            write: {
                'setPIN': { name: 'PIN', type: 'Number'},
                'setTime': { name: 'Time', type: 'Date'},
            }
        };
    }

    async getTime() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_TIME);

        const minute = value.getUint8(0);
        const hour = value.getUint8(1);
        const day = value.getUint8(2);
        const month = value.getUint8(3);
        const year = value.getUint8(4);

        return { 'time': new Date(year + 2000, month - 1, day, hour, minute)};
    }

    async setTime(time) {
        if (!time) {
            time = Date.now();
        }

        const date = new Date(time);

        const timeBytes = new Uint8Array([
            date.getMinutes(),
            date.getHours(),
            date.getDate(),
            date.getMonth() + 1,
            date.getFullYear() - 2000
        ]);

        return await this._setCharacteristicValue(SERVICE_UUID, CH_TIME, timeBytes);
    }

    async getTemperatures() {
        const WINW = {
            4: 'HIGH',
            8: 'MID',
            12: 'LOW'
        }

        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_TEMPS);



        return {
            currentTemp: value.getInt8(0) / 2,
            manualTemp: value.getInt8(1) / 2,
            targetTempLow: value.getInt8(2) / 2,
            targetTempHigh: value.getInt8(3) / 2,
            offsetTemp: value.getInt8(4) / 2,
            windowOpenDetection: WINW[value.getInt8(5)],
            windowOpenMinutes: value.getInt8(6)
        };
    }

    async getBattery() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_BATT);
        return {'batt': value.getUint8(0)};
    }

    async getLCDTimer() {
        const value = await this._getCharacteristicValue(SERVICE_UUID, CH_LCD_TIMER);
        return {
            preload: value.getUint8(0),
            current: value.getUint8(1)
        };
    }

    async setPIN(pin) {
        const buffer = new ArrayBuffer(4);
        const view = new DataView(buffer);
        view.setUint32(0, pin, true);

        await this._setCharacteristicValue(SERVICE_UUID, CH_PIN, buffer);
    }
}