const SERVICE_DEVICE_INFO_UUID = '0000180a-0000-1000-8000-00805f9b34fb';

const CH_MANUFACTURER_NAME_UUID = '00002a29-0000-1000-8000-00805f9b34fb';
const CH_MODEL_NUMBER_UUID = '00002a24-0000-1000-8000-00805f9b34fb';
// const CH_SERIAL_NUMBER_UUID = '00002a25-0000-1000-8000-00805f9b34fb'; // blacklisted
const CH_FIRMWARE_REVISION_UUID = '00002a26-0000-1000-8000-00805f9b34fb';
const CH_HARDWARE_REVISION_UUID = '00002a27-0000-1000-8000-00805f9b34fb';
const CH_SOFTWARE_REVISION_UUID = '00002a28-0000-1000-8000-00805f9b34fb';
const CH_SYSTEM_ID_UUID = '00002a23-0000-1000-8000-00805f9b34fb';


export class BTLEDevice {

    constructor(device) {
        this.device = device;
        this.services = {};
    }

    getName() {
        throw new Error('getName not implemented');
    }

    setDevice(device) {
        this.device = device;
    }

    static isAvailable() {
        return !!navigator.bluetooth && typeof navigator.bluetooth.requestDevice === 'function';
    }

    isSuitableDevice(device) {
        return device.name === this._requestFilter().name;
    }

    isConnected() {
        return this.device && this.device.gatt.connected;
    }

    async requestAndConnect() {
        if (!this.device) {
            await this.request();
        }
        if (!this.device.gatt.connected) {
            await this.connect();
        }
    }
    
    async request() {
        this.device = await navigator.bluetooth.requestDevice({
            filters: [this._requestFilter()],
            optionalServices: this._requestServices()
        });
    }

    /* abstract */
    _requestFilter() {
        throw new Error('_requestFilter not implemented');
    }

    /* abstract */
    _requestServices() {
        throw new Error('_requestServices not implemented');
    }

    /* abstract */
    image() {
        return null;
    }

    async connect() {
        this.server = await this.device.gatt.connect();
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            await this.device.gatt.disconnect();
        }
        this.services = {};
    }

    getDeviceName() {
        return this.device.name;
    }

    getDeviceId() {
        return this.device.id;
    }

    static infoServices() {
        return [SERVICE_DEVICE_INFO_UUID];
    }

    async readInfo() {
        const manufacturer = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_MANUFACTURER_NAME_UUID);
        const model = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_MODEL_NUMBER_UUID);
        const firmware = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_FIRMWARE_REVISION_UUID);
        const hardware = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_HARDWARE_REVISION_UUID);
        const software = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_SOFTWARE_REVISION_UUID);
        const systemId = await this._getCharacteristicValue(SERVICE_DEVICE_INFO_UUID, CH_SYSTEM_ID_UUID);

        return {
            'Manufacturer Name': manufacturer ? new TextDecoder().decode(manufacturer) : null,
            'Model Number': model ? new TextDecoder().decode(model) : null,
            'Firmware Revision': firmware ? new TextDecoder().decode(firmware) : null,
            'Hardware Revision': hardware ? new TextDecoder().decode(hardware) : null,
            'Software Revision': software ? new TextDecoder().decode(software) : null,
            'System ID': systemId ? new TextDecoder().decode(systemId) : null
        };
    }

    async _getCharacteristics(serviceUuid, characteristicUuid) {
        if (!this.server || !this.server.connected) {
            throw new Error('Not connected');
        }
        
        serviceUuid = serviceUuid.toLowerCase();
        characteristicUuid = characteristicUuid.toLowerCase();

        if (!this.services[serviceUuid]) {
            this.services[serviceUuid] = await this.server.getPrimaryService(serviceUuid);
        }
        return await this.services[serviceUuid].getCharacteristic(characteristicUuid);
    }

    async _getCharacteristicValue(serviceUuid, characteristicUuid) {
        try {
            const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
            return await characteristic.readValue();
        } catch (error) {
            console.error('Failed to read characteristic value', error);
            return null;
        }
    }

    async _setCharacteristicValue(serviceUuid, characteristicUuid, value) {
        try {
            const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
            return await characteristic.writeValue(value);
        } catch (error) {
            console.error('Failed to write characteristic value', error);
            return null;
        }
    }

    async _getNotifiedValue(serviceUuid, characteristicUuid) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        return new Promise((resolve, reject) => {
            const handleCharacteristicValueChanged = async (event) => {
                try {
                    const value = event.target.value;
                    characteristic.stopNotifications().catch(console.error);
                    characteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
                    resolve(value);
                } catch (error) {
                    reject(error);
                }
            }

            characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

            return characteristic.startNotifications();
        });
    }

    async _getNotifiedValueEventEmitter(serviceUuid, characteristicUuid) {
        const characteristic = await this._getCharacteristics(serviceUuid, characteristicUuid);
        const emitter = new EventEmitter();

        const handleCharacteristicValueChanged = (event) => {
            emitter.emit('value', event.target.value);
        }

        emitter.stop = () => {
            characteristic.stopNotifications().catch(console.error);
            characteristic.removeEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        };
        
        characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);
        characteristic.startNotifications();

        return emitter;   
    }

}