export function getFormattedTime(time: number) {
    let timeStr = "";
    let hour = Math.floor(time);
    if (hour === 0) hour = 12;
    let min = Math.round(60 * (time - Math.floor(time)));
    if (min < 15) {
        min = 0;
    } else if (min < 45) {
        min = 30;
    } else {
        min = 0;
        hour += 1;
    }
    if (min < 10) {
        timeStr = hour.toFixed(0) + ":0" + min;
    } else {
        timeStr = hour.toFixed(0) + ":" + min;
    }
    return timeStr;
}

export function throttle(callback: (event: MouseEvent) => void, wait: number) {
    let start: number = 0;
    return function (event: MouseEvent) {
        const current: number = Date.now();
        if (current - start > wait) {
            callback.call(null, event);
            start = current;
        }
    };
}

export function throttle2(func: Function, delay: number) {
    let lastExecTime = 0;
    let timeoutId: any;

    return function (...args: any[]) {
        const currentTime = Date.now();

        if (currentTime - lastExecTime >= delay) {
            func(...args);
            lastExecTime = currentTime;
        } else {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                func(...args);
                lastExecTime = currentTime;
            }, delay);
        }
    };
}
