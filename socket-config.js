module.exports.configSocket = function(io){
    module.exports.updMsg = function(){
        io.emit("upd",{});
    };
};