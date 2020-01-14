XLSX = require('xlsx')
path = require('path')
const puppeteer = require('puppeteer')
var wb = XLSX.readFile(path.resolve(__dirname, '../parts.xlsx'))
const REPORT_SHEET_NAME = 'Sheet1'
const ws = wb.Sheets[REPORT_SHEET_NAME];
rawdata = XLSX.utils.sheet_to_json(ws, { header: 1 })
var mysql = require('mysql');
//check point 
console.log(rawdata)
// console.log(rawdata[0].length)
//-------------------------------------------------------------------------
start()//puppeteer 开始爬虫
//-------------------------------------------------------------------------
async function start() {
    console.log('start')
    //连接服务器
    await connectMysql().then(function (resolve) {
        console.log(resolve), (function (reject) {
            console.log(reject)
        })
    })
    await createMotherTable().then(function (resolve) {
        console.log(resolve), (function (reject) {
            console.log(reject)
        })
    })
    //首先创建表
    const insertbomtable = 'CREATE table if not exists partBom(partNumber VARCHAR(20) NOT NULL,Descriptions VARCHAR(200),UNIQUE KEY (partNumber),PRIMARY KEY(partNumber))'
     async function resultinfo(){
    con.query(insertbomtable, function (err, result) {
        if (err) {
            console.log(err);
        } else {
            if(result.warningCount==1){//1 means the table is existed
                console.log("BOM already exist in")
            }
        }
    })
    return("BOM already exist")
}
returninfor= await resultinfo()
console.log(returninfor)
    for (let x = 1; x < rawdata.length; x++) {
        console.log("number" + x + "--------------------------------------------------------")
        PN = rawdata[x][0]
        starPN = rawdata[x][0] + '*'
        tablePN = 't' + PN.replace('-', '').trim()
        console.log("PN is " + PN)
        console.log('starPN is ' + starPN)
        //estimate if the PN is effective in EDOC;
        ReceiveDescription = await runDescription(starPN)//get description
        PNDescriptionComb = []
        PNDescriptionComb.push(PN)
        PNDescriptionComb.push(ReceiveDescription)
        await writeDescription(PNDescriptionComb)//把PN and description 写入到一个表里面
        if (ReceiveDescription != 'notfounded') {
            console.log(ReceiveDescription)//display PNDescription received
            //get the PN receivinf date
            receivingDate = await runDate(PN)//run function get PN receivingdate, and PO number, as well as rev
            console.log(receivingDate)
            receivingDate[0][3] = PN//把PN 赋值给接受的时间，然后传进去下一个函数里面
            kitrow = await runkit(receivingDate)
            console.log(kitrow)
            display = []
            for (let k = 0; k < receivingDate.length; k++) {
                onerow = []
                onerow.push(PN);
                onerow.push(ReceiveDescription);
                onerow.push(receivingDate[k][0])
                onerow.push(receivingDate[k][1])
                onerow.push(kitrow[k])
                display.push(onerow)
            }
            console.log('the final display is:')
            console.log(display)
            //end loop
            await createPNTable(tablePN)//创建一个table 给每一个PN；
            await thenSql(display)//判断这一次的数据和上一次的是都有差距，如果有就显示出来
            await writemysql(display)
        }
    }
}

//-------------------------------------------------------------------------
async function connectMysql() {
    con = mysql.createConnection({
        host: "localhost",
        user: "root",
        password: "",
        database: "testbook"
    })
    let connectSql = new Promise(function (resolve, reject) {
        con.connect(function (err) {
            if (err) {
                reject(err)
            }
            else {
                resolve("Connected!")
            }
        })
    })
    return connectSql
}
//-------------------------------------------------------------------------
async function createMotherTable() {
    //首先创建表
    const insertbomtable = 'CREATE table if not exists partBom(partNumber VARCHAR(20) NOT NULL,Descriptions VARCHAR(200),UNIQUE KEY (partNumber),PRIMARY KEY(partNumber))'
    let returnInfo = new Promise(function (resolve, reject) {
        con.query(insertbomtable, function (err, result) {
            if (err) {
                reject(err)
            } else {
                if (result.warningCount == 1) {//1 means the table is existed
                    resolve("BOM already exist")
                }
            }
        })
    })
    return returnInfo
}

//function to get description. 
async function runDescription(pn) {
    const browser = await puppeteer.launch({
        devtools: true,
        headless: true,
        ignoreHTTPSErrors: true
    })
    const page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiReviewMain.asp?txtProduct=EDOC&Tab=4', { waitUntil: 'load', timeout: 0 })
    await page.evaluate((pn) => {
        const selectorId = '#txtNumber'
        document.querySelector(selectorId).value = pn
        const next = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(3) > table > tbody > tr:nth-child(2) > td:nth-child(2) > input[type=submit]'
        document.querySelector(next).click()
    }, pn)
    //the following is the next page
    await page.waitForNavigation()//wait for the response
    let PNDescription = await page.evaluate(() => {
        const PNDescriptionSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(3) > tbody > tr:nth-child(2) > td:nth-child(3) > div'
        let description = document.querySelector(PNDescriptionSelector).innerHTML
        if (description) {
            return description
        } else {
            return 'notfounded'
        }
    })
    await page.close()
    await browser.close()
    return PNDescription
}
//-------------------------------------------------------------------------
//function to get date
async function runDate(pn) {
    const browser = await puppeteer.launch({
        devtools: true,
        headless: true,
        ignoreHTTPSErrors: true
    })
    const page = await browser.newPage()
    await page.goto('http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiPartPmemoHistory.asp?txtProduct=EDOC&Reg=1&Tab=4&TypeFlag=Part', { waitUntil: 'load', timeout: 0 })
    await page.evaluate((pn) => {
        const selectorId = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(2) > input'
        document.querySelector(selectorId).value = pn
        const next = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > form:nth-child(2) > table > tbody > tr:nth-child(1) > td:nth-child(3) > input[type=image]:nth-child(1)'
        document.querySelector(next).click()
    }, pn)
    console.log('step of getDate: first page logged')
    //thefollowing is the date page
    await page.waitForNavigation()//wait for the response
    //get the rev 
    let rev = await page.evaluate(() => {
        const revSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+1) > td:nth-child(3) > div > font > a'
        let resultREV = []//defin a materix to save those data.
        let x = document.querySelectorAll(revSelector);
        for (let i = 0; i < x.length; i++) {
            resultREV[i] = x[i].innerHTML.trim()
        }
        console.log("revResult:")
        console.log(resultREV)
        return resultREV
    })//finish get rev data
    console.log(rev)
    let date = await page.evaluate(() => {
        const datereceived = 'td:nth-child(9) font'
        //这两个其实一样，但是长的那个是origional 的
        //const datereceived='body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+2) > td:nth-child(9) > div > font'
        let result = []//defin a materix to save those data.
        //next is to save those data
        let x = document.querySelectorAll(datereceived);
        for (let i = 0; i < x.length; i++) {
            result[i] = x[i].innerHTML.trim()
        }
        //保存数据
        if (result) {
            return result
        } else {
            return 'notfounded'
        }
    })
    console.log('date requird')
    //由于现在的这个列表里面可能有很多的购买次数，但是这些无法直接显示出来，所以需要再运行一下这些数据来获取一个信息就是kit
    text = await page.evaluate(() => {
        url = [];
        //urlSelector=' tr:nth-child(n) > td:nth-child(12) a'
        urlSelector = ' tr:nth-child(n+2) > td:nth-child(12) > div '
        let x = document.querySelectorAll(urlSelector)
        for (let i = 0; i < x.length; i++) {
            url[i] = x[i].innerText
            if (url[i]) {
                url[i] = url[i].replace('Kits for ', '').trim()
            }
        }
        return url
    })
    console.log("step of Kit:")
    console.log(text)
    matrix = []
    for (i = 0; i < date.length; i++) {
        temp = []
        temp.push(rev[i])
        temp.push(date[i])
        temp.push(text[i])
        matrix.push(temp)
    }
    //console.log(matrix)
    await page.close()
    await browser.close()
    return matrix
}
//-------------------------------------------------------------------------
async function runkit(receivingDate) {
    eachKit = []
    for (let i = 0; i < receivingDate.length; i++) {
        if (receivingDate[i][1] != '') {
            const browser = await puppeteer.launch({
                devtools: true,
                headless: true,
                ignoreHTTPSErrors: true
            })
            const page = await browser.newPage()
            urllink = 'http://rdt.kla-tencor.com/rdt2/edoc_ei/scripts/eiPartToKit.asp?Reg=1&Tab=4&txtPN=' + receivingDate[0][3] + '&txtPONo=' + receivingDate[i][2]
            await page.goto(urllink, { waitUntil: 'load', timeout: 0 })
            let tempKit = await page.evaluate(() => {
                kitSelector = 'body > table > tbody > tr > td > table:nth-child(3) > tbody > tr > td:nth-child(2) > table:nth-child(2) > tbody > tr:nth-child(n+4) > td:nth-child(1) > div > font > a'
                kit = ''
                let x = document.querySelectorAll(kitSelector)
                console.log(x.length)
                for (let j = 0; j < x.length; j++) {
                    kit = x[j].textContent + ';' + kit
                }
                console.log(kit)
                return kit
            })
            eachKit[i] = tempKit
            await page.close()
            await browser.close()
        } else {
            eachKit[i] = ''
        }
    }
    //console.log(eachKit)
    return eachKit
}
//-------------------------------------------------------------------------
async function writeDescription(PNDescriptionComb) {//把PN and description 写入到一个表里面
    const insertdescription = 'REPLACE INTO partbom VALUES (' + "'" + PNDescriptionComb[0] + "'" + ',' + "'" + PNDescriptionComb[1] + "'" + ')'
    await con.query(insertdescription, function (err, result) {
        if (err) {
            console.log(err)
        }
        else {
            console.log(PN + ' Description inserted into sql')
        }
    })
}
//--------------------------------------------------------------------------------------
//给每一个PN 创建一个Table 如果这个Table 不存在
async function createPNTable(tablePN) {
    //console.log(alldata)
    //开始写入mysql
    //create the PN table

    const insertPNtable = 'CREATE table if not exists ' + tablePN + '(PID int(10) primary key not null auto_increment,REV VARCHAR(20),DATERECEIVED VARCHAR(20),KIT4PO VARCHAR(2000) )'
    con.query(insertPNtable, function (err, result) {
        if (err) {
            console.log(err)
        }
        else {
            if (result.warningCount == 1) {//1 means the table is existed
                console.log("BOM already exist")
            } else {
                console.log('create Table of' + tablePN + 'Successful')
            }
        }
    })
}

//--------------------------------------------------------------------------------------
function getSql(display) {
    let P = new Promise(function (resolve, reject) {
        tablePN = 't' + display[0][0].replace('-', '').trim()
        const selectall = 'select * from  ' + tablePN
        let dataArray = []
        con.query(selectall, function (err, result, fields) {
            if (!err) {
                for (let i = 0; i < result.length; i++) {
                    let rachrow = Object.values(result[i])
                    dataArray.push(rachrow)
                }
                //console.log(dataArray)
                resolve(dataArray)

            }
            else {
                reject(err)
            }
        })
    })
    return P
}
//--------------------------------------------------------------------------------------
async function thenSql() {
    noEqualAlert = []
    let currentSql = getSql(display)//创建一个table 给每一个PN；
    tablePN = 't' + display[0][0].replace('-', '').trim()
    currentSql.then(function (resolve) {
        for (let i = 0; i < resolve.length; i++) {
            if (display[i][3].trim() != resolve[i][3].trim()) {
                noEqualAlert.push(i)
                console.log(display[i][3].trim())
                console.log(resolve[i][3].trim())
            }
        }
        if (noEqualAlert != '') {
            console.log("the change of receive date is happening on the PartNumber of " + display[0][0])
            const TruncateTable = 'TRUNCATE TABLE ' + tablePN
            con.query(TruncateTable, function (err, result, fields) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("数据库清空")
                }
            })
        }
    }, function (reject) {
        console.log('SQL 数据获取失败')
    })
}
//--------------------------------------------------------------------------------------
async function writemysql(display) {
    tablePN = 't' + display[0][0].replace('-', '').trim()
    //写入数据，覆盖原表格
    for (let i = 0; i < display.length; i++) {
        let j = i + 1
        const insertDetails = "replace into " + tablePN + "(pid,rev,DATERECEIVED,KIT4PO) values('" + j + "','" + display[i][2] + "','" + display[i][3] + "','" + display[i][4] + "')"
        con.query(insertDetails, function (err, result) {
            if (err) {
                console.log(err)
            }
            else {
                console.log(display[0][0] + ':   insert/replace successful')
            }
        })
    }


}