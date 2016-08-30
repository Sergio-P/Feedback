module.exports.configSocket = function(io){
    module.exports.updMsg = function(){
        console.log(io);
	    console.log(io.of("/Feedback"));
        io.of("/Feedback").emit("upd",{});
    };
};
