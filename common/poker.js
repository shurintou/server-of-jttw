var localCardList = [
    { num: 2, suit: 4, src: '2A', name: '妖怪2' },
    { num: 2, suit: 3, src: '2B', name: '妖怪2' },
    { num: 2, suit: 2, src: '2C', name: '妖怪2' },
    { num: 2, suit: 1, src: '2D', name: '妖怪2' },
    { num: 4, suit: 4, src: '4A', name: '妖怪4' },
    { num: 4, suit: 3, src: '4B', name: '妖怪4' },
    { num: 4, suit: 2, src: '4C', name: '妖怪4' },
    { num: 4, suit: 1, src: '4D', name: '妖怪4' },
    { num: 6, suit: 4, src: '6A', name: '妖怪6' },
    { num: 6, suit: 3, src: '6B', name: '妖怪6' },
    { num: 6, suit: 2, src: '6C', name: '妖怪6' },
    { num: 6, suit: 1, src: '6D', name: '妖怪6' },
    { num: 7, suit: 4, src: '7A', name: '妖怪7' },
    { num: 7, suit: 3, src: '7B', name: '妖怪7' },
    { num: 7, suit: 2, src: '7C', name: '妖怪7' },
    { num: 7, suit: 1, src: '7D', name: '妖怪7' },
    { num: 9, suit: 4, src: '9A', name: '妖怪9' },
    { num: 9, suit: 3, src: '9B', name: '妖怪9' },
    { num: 9, suit: 2, src: '9C', name: '妖怪9' },
    { num: 9, suit: 1, src: '9D', name: '妖怪9' },
    { num: 11, suit: 4, src: '11A', name: '妖怪J' },
    { num: 11, suit: 3, src: '11B', name: '妖怪J' },
    { num: 11, suit: 2, src: '11C', name: '妖怪J' },
    { num: 11, suit: 1, src: '11D', name: '妖怪J' },
    { num: 12, suit: 4, src: '12A', name: '妖怪Q' },
    { num: 12, suit: 3, src: '12B', name: '妖怪Q' },
    { num: 12, suit: 2, src: '12C', name: '妖怪Q' },
    { num: 12, suit: 1, src: '12D', name: '妖怪Q' },
    { num: 13, suit: 4, src: '13A', name: '妖怪K' },
    { num: 13, suit: 3, src: '13B', name: '妖怪K' },
    { num: 13, suit: 2, src: '13C', name: '妖怪K' },
    { num: 13, suit: 1, src: '13D', name: '妖怪K' },
    { num: 14, suit: 4, src: '1A', name: '妖怪A' },
    { num: 14, suit: 3, src: '1B', name: '妖怪A' },
    { num: 14, suit: 2, src: '1C', name: '妖怪A' },
    { num: 14, suit: 1, src: '1D', name: '妖怪A' },
    { num: 21, suit: 4, src: '3A', name: '沙僧' },
    { num: 21, suit: 3, src: '3B', name: '沙僧' },
    { num: 21, suit: 2, src: '3C', name: '沙僧' },
    { num: 21, suit: 1, src: '3D', name: '沙僧' },
    { num: 22, suit: 4, src: '8A', name: '八戒' },
    { num: 22, suit: 3, src: '8B', name: '八戒' },
    { num: 22, suit: 2, src: '8C', name: '八戒' },
    { num: 22, suit: 1, src: '8D', name: '八戒' },
    { num: 23, suit: 4, src: '5A', name: '悟空' },
    { num: 23, suit: 3, src: '5B', name: '悟空' },
    { num: 23, suit: 2, src: '5C', name: '悟空' },
    { num: 23, suit: 1, src: '5D', name: '悟空' },
    { num: 31, suit: 4, src: '10A', name: '唐僧' },
    { num: 31, suit: 3, src: '10B', name: '唐僧' },
    { num: 31, suit: 2, src: '10C', name: '唐僧' },
    { num: 31, suit: 1, src: '10D', name: '唐僧' },
    { num: 100, suit: 1, src: 'black-joker', name: '反弹' },
    { num: 100, suit: 2, src: 'red-joker', name: '反弹' },
]

module.exports = {
    cardList: localCardList,

    getIndexOfCardList: function(index){
        if(index < 100){
            return localCardList[index]
        }
        return localCardList[index - 100]
    },
    
    shuffle: function(array, size) {
        var index = -1,
            length = array.length,
            lastIndex = length - 1

        size = size === undefined ? length : size
        while (++index < size) {
            var rand = index + Math.floor( Math.random() * (lastIndex - index + 1))
                value = array[rand]
            array[rand] = array[index]
            array[index] = value
        }
        array.length = size
        return array
    },

    waitTime: 20000,
    offLineWaitTime: 1000,
}