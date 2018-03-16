#!/usr/bin/env node

/*
	Run by default in interactive mode. When called in script mode, process.exit() should be called in your script to exit the nodejs app.
	Arguments:
	- a path which target a JavaScript file to execute (.js extension).
	- a path which target an ipc path.
*/


var net = require('net');
var repl = require('repl');
var promisify = require("repl-promised").promisify;
var moment = require('moment');
var fs = require('fs')
var vm = require('vm');
var ipcpath = require('./getIpcPath.js');
require('es6-shim');

var Web3 = require('web3');
var web3Extensions = require('./web3Extensions.js');

var ipcPath = ipcpath();
var jsScript;
var help = false;
if (!processArguments())
	return;

if (help) {
	console.log("Usage: ethconsole [JavaScript file] [IPC socket]\n\n" +
		"web3.js based Ethereum console that connects to local running node via IPC.\n" +
		"Default IPC path: " + ipcpath() + "\n\n" +
		"Arguments:\n" +
		"	<JavaScript file>	execute the given JavaScript file non-interactively.\n" +
		"				The script has to call process.exit() in order to terminate the console.\n"+
		"	<IPC socket path>	connect to the given IPC socket (use ipc://<path> if path does not end with \".ipc\")\n");
	return;
}

process.on('uncaughtException', function(err) {
	console.error("Uncaught exception: " + err);
});

console.log("ETHEREUM CONSOLE");

console.log("Connecting to node at " + ipcPath + " ...");

var web3 = new Web3(new Web3.providers.IpcProvider(ipcPath, net));
web3Extensions.extend(web3);
global.web3 = web3;


web3.eth.net.getNetworkType()
.then(function(type){
	console.log("Connection successful!\n");

	console.log("ΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞ");
	console.log("Network: " + type.toUpperCase());
	return web3.eth.getBlock('latest');
})
.then(function(block) {
	console.log("Current block: " + block.number + " ("+ moment.unix(block.timestamp).format('MMMM Do YYYY, HH:mm:ss') +")");
})
.then(function(){

console.log("ΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞΞ\n");

	if (jsScript)
		executeScript();
	else {
		promisify(repl.start({
			prompt: "> ",
			input: process.stdin,
			output: process.stdout
		}));
	}
})
.catch(function(e){
	console.error("Could not connect to node. Please start an Ethereum node first.");
	console.error(String(e));
	console.log('Exit due to error.');
	process.exit();
});

function processArguments()
{
	var notRecognized = false;
	for (var k = 2; k < process.argv.length; k++)
	{
		var arg = process.argv[k];
		if (arg.endsWith('.js'))
			jsScript = arg;
		else if (arg === "help" || arg === "--help" || arg === "-h")
			help = true;
		else if (arg.startsWith("ipc:") || arg.endsWith(".ipc"))
			ipcPath = arg.startsWith("ipc:") ? arg.substring(4) : arg;
		else
		{
			notRecognized = true;
			console.log("Argument not recognized " + arg);
		}
	}
	if (notRecognized)
	{
		logHelp();
		return false;
	}
	return true;
}

function executeScript()
{
	console.log("Executing " + jsScript + " ...");
	fs.readFile(jsScript, 'utf8', function (err, data)
	{
		if (err)
		{
			console.log(err);
			process.exit();
		}
		else
		{
			var script = new vm.Script(data);
			script.runInThisContext();
		}
	});
}
