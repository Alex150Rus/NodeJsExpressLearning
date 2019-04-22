// index.js наша точка входа
// Фрэймворк Express - самый популярный, зная его можно сказать, что мы покрываем 80-90% задач, требующихся от современного Node.JS разработчика
// Это не единственный фрэймворк, но Express самый развитый и самый первый из массы подобных и аналогичны, которые сделаны 
// по образу и подобию Express<br>

//подключили: в переменную записали функцию с помощью которой мы можем создавать приложения. Она похожа на фабричный метода с помощью
//которого можно создавать объекты
const express = require('express');

//middlware body-parser нужен для получения данных с post запроса, который может быть отправлен в разных форматах: из обыкновенной формы,
//url encoded, multiplatform data, json...Устанавливаем, импортируем и подключаем к экспрессу как middleware app.use(bodyParser.json())
//далее указываем какой формат мы хотим использовать .json() - если отправляем данные аяксом или .urlencoded() - данные летят экшоном с формы 
// вообще можно сразу несколько форматов указывать. Поэтому при работе с body-parser сразу нужно указывать необходимые заголовки, для json это:
//Key:Content-Type, value(application/json). С помощью заголовков body-parser узнает какой формат использовать, чтобы распарсить запрос и 
//положить в body Результат. Так что не забываем указывать content type - это особенно касается ajax запросов.
const bodyParser = require('body-parser');
const request = require('request');
const cheerio = require('cheerio');
const consolidate = require('consolidate');
const path = require('path');

function sendRequest(url) {
  return new Promise((resolve, reject) => {
    request(url, (err, response, body)=>{
      if(err) {
        reject(err);
      }
      resolve(cheerio.load(body));
    });
  })
}
async function fetchNews(url) {
  const $newsPage = await sendRequest(url);
  const newsHeads = Array.prototype.slice.call($newsPage('.main__feed__link'),0)
                    .map(item=>({title: $newsPage(item).text().replace(/\n/g, '').trim(), href: $newsPage(item).attr('href')}));
  const news = await Promise.all(newsHeads.map(async item => {
    const $item = await sendRequest(item.href);
    const content = $item('.article__text__overview').eq(0).text().replace(/\n/g, '').trim();
    return {...item, content}
  }))
  return news;
}

//первое что нужно сделать - создать приложение. app - самый важный объект, который хранит все настройки нашего приложения, через него
//осуществляется вся работа с фрэймворком: роутинг, настройка, подключение расширений.
//Express фрэймворк примечателен тем, что он очень очень маленький, не нагружает систему, не добавляет огромных зависимостей, решает свою
//маленькую задачу. По дефолту содержит всё самое необходимое, но легко расширяется с помощью доп. модулей - middleware
const app = express();

app.engine('hbs', consolidate.handlebars);
app.set('view engine', 'hbs');
app.set('views', path.resolve(__dirname,'views'));
//директория шаблонов


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true,
}));
//Как устроена middleware? Это функция, практически такая же как обработчик роутов, но принимает три параметра: req, res, next. Что чаще всего делается 
//в рамках middleware? Она срабатывает абсолютно на все запросы. Не важно на какой end-point он идёт, каим методом. Если у нас три middleware
// app.use(), то при каждом запросе сработает каждая (она либо может пропустить запрос дальше - либо отработать - остановить на себе, если пропускает
// дальше,то она вызывает метод next). Также middleware могут использоваться для парсинга, для проверки авторизации... Если пользователь авторизован,
//то пропускаем его дапльше при помощи next(), в противном случае - сделать редирект на страничку авторизации. Часто middleware используются для
//обогощение объектов req и res или обоих сразу дополнительными свойствами/методами

app.use(function(req, res, next){
  //обогатили. Станет доступно во всех запросах
  req.property = 'Hello';
  //если этот метод не указать - то будет вчно кружок подгрузки крутиться. Поэтому в собственных middleware надо обязательно вызывать метод next()
  next();
});

//Роутинг и его обработчики

//хотим получать что-то гетом. request - объект запроса содержит заголовки, параметры запроса, respons - объект ответа.
//они обогащены доп.свойствами и методами, с которыми писать проще
app.get('/users', (request, response) => {
  response.send('Hello user!');
})

// если добавили после запуска сервера, то его нужно перезапустить
app.get('/', (req, res) => {
  res.send('Зри в корень))');
})

app.get('/news', async (req, res) => {
const news = await fetchNews('https://www.rbc.ru/');
//res.json(news);
res.render('news', {news: news.map((item, idx)=>({...item, idx: idx+1}))});
})

//Существует возможность шаблонизации всех запросов. Мы можем указать, что одна из частей нашего endpoint - подставляемая часть(:id):
app.get('/news/:id', async (request, response) => {
  const news = await fetchNews('https://www.rbc.ru/');
  //response.json(news[request.params.id - 1]);
  //передаём имя файла шаблона и объект со свойствами title и item
  response.render('item', news[request.params.id-1]);
}) 
//req.params.id будет хранить значение этого параметра. Этих параметров
//в рамках урла может быть сколько угодно /news/:id/:count/:length - единственное требование: имена должны быть уникальны

app.post('/users', (req, res)=>{
  //.body()появляется после  подключения body-parser. В программе postman в body можно написать json объект, который получим в консоли после преобразования
  console.log(req.body);

  res.send('Ок');
})

//указываем какой порт будем слушать. И в браузере вбиваем http://localhost:8888/users. Получаем ответ.
app.listen(8888);

//В экспрессе существует приоритет обработчиков запросов. Сначал срабатывают общие, а потом более конкретные. Т.е. при обработке любого запроса срабатывают
// middleware, потом чуть менее общие app.all('/',(req, res, next)=>{next()}) - обрабатывает запросы любыми методами на endpoint '/users', потом app.get()..
// use->all->get

//рассмотрим шаблонизаторы. Понадобятся пакеты: consolidate (прикручивает к экспрессу любой шаблонизатор - мы будем использовать handlebars, но можно)
//использовать pug и другие