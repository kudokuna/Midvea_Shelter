fetch('https://www.google.com/search?tbm=isch&q=facebook+icon').then(r=>r.text()).then(t=>{ const m = t.match(/<img[^>]+src="([^"]+)"/g); console.log(m ? m.slice(0,5) : 'none') })
