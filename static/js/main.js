var host = window.location.hostname + ":" + window.location.port
const socket = io(host);
console.log('Connecting to WebSocket at '+host);

socket.on('update_info', (info)=>{
	        console.log(info)
	      })

socket.on('update_active', (info)=>{
	        console.log(info)
	      })

function change_source(source_id){
	alert(source_id)
	socket.emit('change_source', source_id)
}
