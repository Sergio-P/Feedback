module.exports.configSocket = function(io){
    module.exports.updMsg = function(){
        io.of("/Feedback").emit("upd",{});
    };
    module.exports.updChat = function(){
        io.of("/Feedback").emit("chat",{});
    };
};
