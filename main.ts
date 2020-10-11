function failSafe () {
    if (input.runningTime() > failSafeCounter + 1000) {
        throttle = 30
        yaw = 0
        pitch = 0
        roll = 0
    }
    if (input.runningTime() > failSafeCounter + 5000) {
        arm = 0
    }
}
function lowBattery () {
    if (batteryEmpty) {
        iconBatteryDead()
    } else if (batteryMilliVolt > lowBatteryLimit - 50) {
        iconBatteryLow()
    } else if (batteryMilliVolt > lowBatteryLimit - 60) {
        if (input.runningTime() % 1000 < 500) {
            iconBatteryLow()
        }
    } else {
        arm = 0
        throttle = 0
        batteryEmpty = true
        iconBatteryDead()
    }
}
function iconBatteryCharging () {
    basic.showLeds(`
        . . # . .
        . # . # .
        . # . # .
        . # . # .
        . # # # .
        `)
    basic.showLeds(`
        . . # . .
        . # . # .
        . # . # .
        . # # # .
        . # # # .
        `)
    basic.showLeds(`
        . . # . .
        . # . # .
        . # # # .
        . # # # .
        . # # # .
        `)
    basic.showLeds(`
        . . # . .
        . # # # .
        . # # # .
        . # # # .
        . # # # .
        `)
}
function mainScreen () {
    basic.clearScreen()
    if (arm == 1) {
        if (input.runningTime() % 500 > 250) {
            led.plot(0, 0)
        }
    }
    led.plot(0, (100 - throttle) / 25)
    led.plot((45 + roll) / 18, (45 + pitch) / 18)
    led.plot(Math.map(yaw, -30, 30, 1, 3), 0)
    if (batteryMilliVolt > 100) {
        if (arm == 1) {
            AirBit.plotYLine(4, Math.round(Math.map(batteryMilliVolt, 3400, 3900, 4, 0)), 4)
        } else {
            AirBit.plotYLine(4, Math.round(Math.map(batteryMilliVolt, 3700, 4200, 4, 0)), 4)
        }
    } else {
        if (input.runningTime() % 500 > 250) {
            led.plot(4, 4)
        }
    }
}
function iconBatteryDead () {
    basic.showLeds(`
        . # # # .
        # . # . #
        # # # # #
        . # . # .
        . # . # .
        `)
}
function calculateBatteryVoltage () {
    batteryMilliVolt = Math.round(pins.analogReadPin(AnalogPin.P0) * batteryFactor * 0.05 + batteryMilliVolt * 0.95)
}
function iconBatteryLow () {
    basic.showLeds(`
            . . # . .
            . # # # .
            . # . # .
            . # . # .
            . # # # .
            `, 0)
}
input.onGesture(Gesture.ScreenDown, function () {
    arm = 0
})
radio.onReceivedString(function (receivedString) {
    commandList = receivedString.split(",")
    for (let commandItem of commandList) {
        command = commandItem.split("=")[0]
        parameter = parseFloat(commandItem.split("=")[1])
        if (command == "A") {
            if (parameter != arm) {
                grandLevel = BMP280.pressure()
                throttle = 0
            }
            arm = parameter
        }
        if (command == "T") {
            if (autoPilot) {
                Altitude = parameter
            } else {
                throttle = parameter
            }
        }
        if (command == "P") {
            pitch = parameter
        }
        if (command == "R") {
            roll = parameter
        }
        if (command == "Y") {
            yaw = parameter
        }
    }
    failSafeCounter = input.runningTime()
})
let oldPressure = 0
let oldAltitude = 0
let oldThrottle = 0
let oldYaw = 0
let oldRoll = 0
let oldPitch = 0
let oldZ = 0
let oldAna = 0
let oldBat = 0
let senseRoll = 0
let sensePitch = 0
let senseZ = 0
let senseAna = 0
let pressure = 0
let buzzer = 0
let Altitude = 0
let parameter = 0
let command = ""
let commandList: string[] = []
let arm = 0
let roll = 0
let pitch = 0
let yaw = 0
let throttle = 0
let failSafeCounter = 0
let autoPilot = false
let grandLevel = 0
let batteryEmpty = false
let batteryMilliVolt = 0
let lowBatteryLimit = 0
let batteryFactor = 0
let radioGroup = 7
basic.showNumber(radioGroup)
radio.setGroup(radioGroup)
batteryFactor = 4.42
lowBatteryLimit = 3400
batteryMilliVolt = 3700
batteryEmpty = false
grandLevel = BMP280.pressure()
serial.redirect(
SerialPin.P1,
SerialPin.P2,
BaudRate.BaudRate115200
)
BMP280.Address(BMP280_I2C_ADDRESS.ADDR_0x76)
BMP280.initBmp280()
pins.setPull(DigitalPin.P5, PinPullMode.PullUp)
autoPilot = input.buttonIsPressed(Button.A)
let sendLimit = 100
let sendTime = input.runningTime()
basic.forever(function () {
    calculateBatteryVoltage()
    led.toggle(4, 0)
    // basic.clearScreen()
    if (pins.analogReadPin(AnalogPin.P0) < 600 && pins.analogReadPin(AnalogPin.P0) >= 400) {
        iconBatteryCharging()
    } else if (batteryEmpty || batteryMilliVolt < lowBatteryLimit && pins.analogReadPin(AnalogPin.P0) > 300) {
        lowBattery()
    } else {
        mainScreen()
        buzzer = 0
    }
    // failSafe()
    if (batteryEmpty) {
        arm = 0
    }
    failSafe()
    pressure = BMP280.pressure()
    if (autoPilot) {
        if (grandLevel - pressure < Altitude / 10) {
            throttle += 0.1
            if (throttle > 100) {
                throttle = 100
            }
        } else if (grandLevel - pressure > Altitude / 10) {
            throttle += -0.1
            if (throttle < 0) {
                throttle = 0
            }
        }
    }
    AirBit.FlightControl(
    throttle,
    yaw,
    pitch,
    roll,
    arm,
    0,
    0
    )
    senseAna = pins.analogReadPin(AnalogPin.P0)
    senseZ = input.acceleration(Dimension.Z)
    sensePitch = input.rotation(Rotation.Pitch)
    senseRoll = input.rotation(Rotation.Roll)
    if (batteryMilliVolt != oldBat) {
        radio.sendString("DB=" + convertToText(batteryMilliVolt))
        oldBat = batteryMilliVolt
        sendTime = input.runningTime()
    }
    if (senseAna != oldAna) {
        radio.sendString("DA=" + convertToText(senseAna))
        oldAna = senseAna
        sendTime = input.runningTime()
    }
    if (senseZ != oldZ) {
        radio.sendString("DG=" + convertToText(senseZ))
        oldZ = senseZ
        sendTime = input.runningTime()
    }
    if (sensePitch != oldPitch) {
        radio.sendString("DP=" + convertToText(sensePitch))
        oldPitch = sensePitch
        sendTime = input.runningTime()
    }
    if (senseRoll != oldRoll) {
        radio.sendString("DR=" + convertToText(senseRoll))
        oldRoll = senseRoll
        sendTime = input.runningTime()
    }
    if (yaw != oldYaw) {
        radio.sendString("DY=" + convertToText(yaw))
        oldYaw = yaw
        sendTime = input.runningTime()
    }
    if (throttle != oldThrottle) {
        radio.sendString("DT=" + convertToText(throttle))
        oldThrottle = throttle
        sendTime = input.runningTime()
    }
    if (Altitude != oldAltitude) {
        radio.sendString("TGT=" + convertToText(Altitude))
        oldAltitude = Altitude
        sendTime = input.runningTime()
    }
    if (pressure != oldPressure) {
        radio.sendString("ALT=" + convertToText(grandLevel - pressure))
        oldPressure = pressure
        sendTime = input.runningTime()
    }
})
