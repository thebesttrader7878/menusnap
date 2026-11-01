from PIL import Image, ImageDraw, ImageFont
W,H=900,1200; im=Image.new('RGB',(W,H),(250,244,230)); d=ImageDraw.Draw(im)
F=lambda s,b=False: ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSerif%s.ttf'%('-Bold' if b else ''),s)
d.text((W//2,60),"ROSA'S TAQUERIA",font=F(56,True),fill=(120,30,20),anchor='mm')
y=140
menu=[("TACOS",[("Al Pastor Taco","Marinated pork, pineapple, cilantro","3.50"),("Carne Asada Taco","Grilled steak, onion, salsa verde","3.75"),("Fish Taco","Battered cod, cabbage slaw, chipotle crema","4.25")]),
("BURRITOS",[("Bean & Cheese Burrito","Refried beans, jack cheese","7.99"),("California Burrito","Carne asada, fries, guacamole","11.50")]),
("SIDES",[("Chips & Guacamole","Fresh made daily","5.00"),("Elote","Street corn, cotija, lime","4.50")]),
("DRINKS",[("Horchata","","3.00"),("Mexican Coke","Glass bottle","3.25")])]
for cat,items in menu:
  d.text((60,y),cat,font=F(36,True),fill=(30,30,30)); y+=55
  for n,ds,p in items:
    d.text((80,y),n,font=F(28,True),fill=(20,20,20)); d.text((W-60,y),"$"+p,font=F(28,True),fill=(20,20,20),anchor='ra'); y+=36
    if ds: d.text((80,y),ds,font=F(20),fill=(90,90,90)); y+=34
    y+=8
  y+=20
im.save('test/sample-menu.jpg',quality=88)
