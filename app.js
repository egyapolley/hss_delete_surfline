const fs = require("fs")
const moment = require("moment")

const soapRequest = require("easy-soap-request");
const parser = require('fast-xml-parser');
const he = require('he');
const options = {
    attributeNamePrefix: "@_",
    attrNodeName: "attr", //default is 'false'
    textNodeName: "#text",
    ignoreAttributes: true,
    ignoreNameSpace: true,
    allowBooleanAttributes: false,
    parseNodeValue: true,
    parseAttributeValue: false,
    trimValues: true,
    cdataTagName: "__cdata", //default is 'false'
    cdataPositionChar: "\\c",
    parseTrueNumberOnly: false,
    arrayMode: false,
    attrValueProcessor: (val, attrName) => he.decode(val, {isAttributeValue: true}),
    tagValueProcessor: (val, tagName) => he.decode(val),
    stopNodes: ["parse-me-as-string"]
};

const input_file = `${__dirname}/input_dir/input_file.lst`
const processed_file = `${__dirname}/processed_dir/${moment().format("YYYYMMDDHHmmss")}-input_file.lst`

const URL ="http://172.21.7.6:18100";


fs.readFile(input_file,{encoding:'utf-8'},async (err, data) => {
    if (err) throw err
    const dataArray = data.trim().split("\n");
    let counter=0
    for (const row of dataArray) {
        let tempArray =row.split(",")
        let [imsi,msisdn,profileID] = tempArray
        try {
            if (await deleteSubDetails(profileID,msisdn)) {
                if (await deleteAuC(imsi,msisdn)) {
                    console.log(`${msisdn} successfully deleted on HSS`)
                    counter++
                }
            }
        } catch (exp) {
            console.log(`Error in deleting ${msisdn} in HSS`)
            console.log(exp)
        }
    }
    console.log("=========================================")
    console.log(`Total sims successfully deleted on HSS => ${counter}`)
    console.log("=========================================")

    fs.rename(input_file,processed_file,err1 => {
        if (err1) console.log("Error in moving file",err1)

    })
})


async function deleteAuC(imsi,msisdn) {
    let msin = imsi.toString().substring(5);
    const sampleHeaders = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
    };

    let xmlRequest=`<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:al="http://www.alcatel-lucent.com/soap_cm" xmlns:bd="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPData" xmlns:bs="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPSystem" xmlns:gd="http://www.3gpp.org/ftp/Specs/archive/32_series/32317/schema/32317-700/GenericIRPData" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <SOAP-ENV:Body>
      <bd:deleteMO>
         <queryXpathExp>
            <al:baseObjectInstance>aucServiceProfileId=1,mSubIdentificationNumberId=${msin},mobileNetworkCodeId=08,mobileCountryCodeId=620,plmnFunctionId=1,managedElementId=HSS1</al:baseObjectInstance>
            <al:scope>BASE_ALL</al:scope>
         </queryXpathExp>
      </bd:deleteMO>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    try {
        const {response} = await soapRequest({url: URL, headers: sampleHeaders, xml: xmlRequest, timeout: 10000}); // Optional timeout parameter(milliseconds)
        const {body} = response;
        let jsonObj = parser.parse(body, options);
        let result = jsonObj.Envelope.Body;
        console.log(JSON.stringify(result))
        return !!(result.deleteMOResponse && result.deleteMOResponse.deletionList && result.deleteMOResponse.deletionList.mo && result.deleteMOResponse.deletionList.mo.moiLocation);
    } catch (e) {
        console.log("Error in deleting  AUC ",msisdn)
        throw e
    }

}
async function deleteSubDetails(profileId,msisdn) {
    const sampleHeaders = {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
    };

    let xmlRequest=`<?xml version="1.0" encoding="UTF-8"?>
<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/" xmlns:SOAP-ENC="http://schemas.xmlsoap.org/soap/encoding/" xmlns:al="http://www.alcatel-lucent.com/soap_cm" xmlns:bd="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPData" xmlns:bs="http://www.3gpp.org/ftp/Specs/archive/32_series/32607/schema/32607-700/BasicCMIRPSystem" xmlns:gd="http://www.3gpp.org/ftp/Specs/archive/32_series/32317/schema/32317-700/GenericIRPData" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
   <SOAP-ENV:Body>
      <bd:deleteMO>
         <queryXpathExp>
            <al:baseObjectInstance>gsmServiceProfileId=1,suMSubscriptionProfileId=1,suMSubscriberProfileId=${profileId},subscriptionFunctionId=1,managedElementId=HSS1</al:baseObjectInstance>
            <al:scope>BASE_ALL</al:scope>
         </queryXpathExp>
      </bd:deleteMO>
   </SOAP-ENV:Body>
</SOAP-ENV:Envelope>`;

    try {
        const {response} = await soapRequest({url: URL, headers: sampleHeaders, xml: xmlRequest, timeout: 10000}); // Optional timeout parameter(milliseconds)
        const {body} = response;
        let jsonObj = parser.parse(body, options);
        let result = jsonObj.Envelope.Body;
        console.log(JSON.stringify(result))
        return !!(result.deleteMOResponse && result.deleteMOResponse.deletionList && result.deleteMOResponse.deletionList.mo && result.deleteMOResponse.deletionList.mo.moiLocation);
    } catch (e) {
        console.log("Error in deleting HSS Sub ",msisdn)
        throw e
    }

}

