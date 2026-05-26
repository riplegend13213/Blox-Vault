(async()=>{
  try{
    const payload = {
      name: "Test Fruit 2",
      slug: "test-fruit-2",
      description: "A second test product",
      category: "permanent_fruit",
      stock: 5,
      priceBdt: 150,
      priceCrypto: null,
      rarity: "common",
      images: ["https://example.com/img2.png"],
      featured: false,
      deliveryInfo: null,
      active: true
    }

    const res = await fetch('http://localhost:3001/api/admin/products', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'bv_session=cmpkzgfq10000txeg5boq8ti2'
      },
      body: JSON.stringify(payload)
    })
    console.log('status', res.status)
    const text = await res.text()
    console.log('body', text)
  }catch(e){
    console.error(e)
  }
})()
