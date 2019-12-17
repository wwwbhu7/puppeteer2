XLSX = require('xlsx')
path =require('path')
const puppeteer = require('puppeteer')
var wb = XLSX.readFile(path.resolve(__dirname,'../parts.xlsx'))
const REPORT_SHEET_NAME='Sheet1'
const ws = wb.Sheets[REPORT_SHEET_NAME];
rawdata=XLSX.utils.sheet_to_json(ws,{header:1})
//check point
//console.log(rawdata)
// console.log(rawdata.length)
// console.log(rawdata[0].length)

//connect with sql
var mysql = require('mysql');
var con = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "122"
  database : "testbook"
});
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

start()//puppeteer 开始爬虫
async function start() {
    console.log('start')
    //循环检查
    for (i=1;i<rawdata.length;i++){
        PN=rawdata[i][0]
        starPN=rawdata[i][0]+'*'
        console.log(PN)
        console.log(starPN)
        //estimate if the PN is effective in EDOC;
        ReceiveDescription = await runDescription(starPN)
        if (ReceiveDescription!='notfounded'){
            console.log(ReceiveDescription)//display PNDescription received.
            //get the PN receivinf date
            receivingDate = await runDate(PN)//run function
            console.log(receivingDate)
        }

        //insert the requested data into sql
        // var sql = 'INSERT INTO part (pn, OldDate) VALUES ('+PN+','+receivingDate+')';
        // con.query(sql, function (err, result) {
        // if (err) throw err;
        // console.log(" record inserted")})

    }
    console.log(rawdata)//显示最新的excel
}
//function to get description.
async function runDescription(pn){
    const browser = await puppeteer.launch({
        devtools:true,
        headless:false,
    })
    //insert PN into column and click the next button
    const page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiReviewMain.asp?txtProduct=EDOC&Tab=4')
    await page.evaluate((pn) =>{
        const selectorId = '#txtNumber'
        document.querySelector(selectorId).value = pn
        const next='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(3) > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=submit]'
        document.querySelector(next).click()
    },pn)
    //the following is the next page
    await page.waitForNavigation()//wait for the response
    let PNDescription=await page.evaluate(() =>{
        const PNDescriptionSelector='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(3) > div'
        let description= document.querySelector(PNDescriptionSelector).innerHTML
        if(description){
            return description
        }else{
            return 'notfounded'}
    })
    await page.close()
    await browser.close()
    return PNDescription

}
//function to get date
 async function runDate(pn) {
    const browser = await puppeteer.launch({
        devtools:true,
        headless:false,
    })
    const page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiPartPmemoHistory.asp?txtProduct=EDOC&Reg=1&Tab=4&TypeFlag=Part')
    await page.evaluate((pn) =>{
        const selectorId = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(2) > input'
        document.querySelector(selectorId).value = pn
        const next='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(3) > input[type=image]:nth-child(1)'
        document.querySelector(next).click()
    },pn)
    console.log('first page logged')
    //thefollowing is the date page
    await page.waitForNavigation()//wait for the response
    let date=await page.evaluate(() =>{
        let result =[]
        const datereceived='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr > td:nth-child(9)'
        result= document.querySelector(datereceived).innerHTML
        console.log('date received', result)

        if(result){
            return result
        }else{
            return 'notfounded'}
    })
    console.log('second  page logged')
    // await page.close()
    // await browser.close()
    return date
}
