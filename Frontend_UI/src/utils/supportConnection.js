import * as signalR from '@microsoft/signalr';
export function createSupportConnection(hubUrl){
 return new signalR.HubConnectionBuilder().withUrl(hubUrl,{transport:signalR.HttpTransportType.WebSockets|signalR.HttpTransportType.LongPolling}).configureLogging(signalR.LogLevel.Warning).withAutomaticReconnect({nextRetryDelayInMilliseconds:ctx=>Math.min(1000*2**ctx.previousRetryCount,15000)}).build();
}
