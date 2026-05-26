(async()=>{
  try{
    const res = await fetch('http://localhost:3001/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'bv_session=cmpkzgfq10000txeg5boq8ti2'
      },
      body: JSON.stringify({})
    })
    console.log('status', res.status)
    const text = await res.text()
    console.log('body', text)
  }catch(e){
    console.error(e)
  }
})()
