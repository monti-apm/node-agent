let count = 0;

console.log(process.env.MONTI_APP_ID);

setInterval(() => {
  count += 1;
  console.log(count);
}, 1000);
