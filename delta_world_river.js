var basinList = [
  101, 102, 103, 104, 105, 106, 107, 108, 109, 110,
  111, 112, 113, 114, 115, 116, 117, 118, 119, 120,
  121, 122, 123, 124, 125, 126, 127, 128, 129, 130,
  131, 132, 133, 134, 135, 136, 137, 138, 139, 140, 141,
  201, 202, 203, 204, 205, 206, 207, 208, 209, 210,
  211, 212, 213, 214, 215, 216, 217, 218, 219,
  301, 302, 303, 304, 305, 306, 307, 308, 309, 310,
  311, 312, 313, 314, 315,
  401, 402, 403, 404, 405, 406, 407, 408, 409, 410,
  411, 412, 413, 414, 415, 416,
  501, 502, 503, 504, 505, 506, 507, 508, 509, 510,
  511, 512, 513, 514, 515,
  601, 602, 603, 604, 605, 606, 607, 608, 609, 610,
  611, 612, 613
];

var startYearAll = 2002;
var endYearAll = 2012;
for (var y = startYearAll; y <= endYearAll; y++) {
  for (var b = 0; b < basinList.length; b++) {
    getbasin(basinList[b], y);
  }
}

function getbasin(i, year) {

  var startMonth = 1;
  var startDate = ee.Date.fromYMD(year, startMonth, 1);

  var endDate = startDate.advance(1, 'year');

  var WRZ_L1 = ee.FeatureCollection("projects/sat-io/open-datasets/WRZ/WRZ_L1")
    .filter(ee.Filter.eq('ID', i));

  var grwl_summary = ee.FeatureCollection("projects/sat-io/open-datasets/GRWL/water_vector_v01_01")
    .filterBounds(WRZ_L1);

  var grwl_vector = grwl_summary
    .filter(ee.Filter.notNull(['width_m']))
    .reduceToImage({
    properties: ['width_m'],
    reducer: ee.Reducer.first()
  });

  var grwlmask = grwl_vector.gt(90).selfMask();

  var jrc = ee.ImageCollection('JRC/GSW1_4/YearlyHistory')
    .filter(ee.Filter.calendarRange(year, year, 'year'))
    .filterBounds(WRZ_L1);

  var jrc2 = ee.Image(jrc.first()).select("waterClass");

  var jrcMask = jrc2.updateMask(
  jrc2.eq(2).or(jrc2.eq(3))
  );

  var grwlMask = grwlmask;

  function maskJRCPixelsLocal(image) {
    return image.updateMask(jrcMask).updateMask(grwlMask);
  }

  var L5 = ee.ImageCollection("LANDSAT/LT05/C02/T1_L2");
  var bn5 = ['SR_B1','SR_B1','SR_B2','SR_B3','SR_B5','QA_PIXEL','SR_B4','SR_B7'];
  var bns = ['uBlue','Blue','Green','Red','Swir1','QA_PIXEL','Nir','Swir2'];

  var cloudMax = 40;
  var p1L5 = L5
    .filterBounds(WRZ_L1.bounds())
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUD_COVER', cloudMax))
    .select(bn5, bns)
    .map(rmCloud1)
    .map(applyScaleFactors);
  var p2L5 = p1L5.map(shuiti).map(maskJRCPixelsLocal);
  var p3L5 = p2L5.map(Rrs).map(getal5)
  var p2L5mean = p3L5.select('imga')

  var bns = ['uBlue', 'Blue', 'Green', 'Red', 'Swir1', 'QA_PIXEL', 'Nir', 'Swir2'];

  var L7 = ee.ImageCollection("LANDSAT/LE07/C02/T1_L2");

  var bn7 = ['SR_B1', 'SR_B1', 'SR_B2', 'SR_B3', 'SR_B5', 'QA_PIXEL', 'SR_B4', 'SR_B7'];

  var p1L7 = L7
    .filterBounds(WRZ_L1.bounds())
    .filterDate(startDate, endDate)
    .filter(ee.Filter.lt('CLOUD_COVER', cloudMax))
    .select(bn7, bns)
    .map(rmCloud1)
    .map(applyScaleFactors);

  var p2L7 = p1L7
    .map(shuiti)
    .map(maskJRCPixelsLocal);

  var p3L7 = p2L7
    .map(Rrs)
    .map(getal7);

  var p2L7mean = p3L7.select('imga');

  // var L8 = ee.ImageCollection("LANDSAT/LC08/C02/T1_L2");

  // var bn8 = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B6', 'QA_PIXEL', 'SR_B5', 'SR_B7'];

  // var p1L8 = L8
  //   .filterBounds(WRZ_L1.bounds())
  //   .filterDate(startDate, endDate)
  //   .filter(ee.Filter.lt('CLOUD_COVER', cloudMax))
  //   .select(bn8, bns)
  //   .map(rmCloud1)
  //   .map(applyScaleFactors);

  // var p2L8 = p1L8
  //   .map(shuiti)
  //   .map(maskJRCPixelsLocal);

  // var p3L8 = p2L8
  //   .map(Rrs)
  //   .map(getal8);

  // var p2L8mean = p3L8.select('imga');

  // var L9 = ee.ImageCollection("LANDSAT/LC09/C02/T1_L2");

  // var p1L9=L9
  //   .filterBounds(WRZ_L1.bounds())
  //   .filterDate(startDate, endDate)
  //   .filter(ee.Filter.lt('CLOUD_COVER', cloudMax))
  //   .select(bn8, bns)
  //   .map(rmCloud1)
  //   .map(applyScaleFactors);
  // var p2L9 = p1L9.map(shuiti).map(maskJRCPixelsLocal);
  // var p3L9 = p2L9.map(Rrs).map(getal8)//.mean();
  // var p2L9mean = p3L9.select('imga')

  var p2mean = p2L7mean
    .merge(p2L5mean)
    .mean();

  var WRZ_L4 = ee.FeatureCollection("projects/sat-io/open-datasets/WRZ/WRZ_L4")
    .filterBounds(WRZ_L1);
  var meantbl = ee.FeatureCollection(WRZ_L4.map(function(f) {

    var geo = f.geometry();

    var scale = 30;
    var blueDict = p2mean.select('imga').reduceRegion({
      geometry: geo,
      reducer: ee.Reducer.mean(),
      scale: scale,
      maxPixels: 1e13,
      tileScale: 4
    });

    var meanblue = ee.Algorithms.If(
    blueDict.get('imga'),
    blueDict.get('imga'),
    'NaN'
    );

    var UID = ee.Number(f.get('ID')).format('%.0f');
    var basin_id = ee.Number(i).format('%.0f');
    return ee.Feature(null, {
      'Rid': UID,
      'basin_id': basin_id,
      'year': year,
      'mean_imga': meanblue
    });
  }));

  var land1 = "L7L5";
  Export.table.toDrive({
    collection: meantbl,
    folder: land1,
    description: land1 + '_' + year + '_' + i,
    fileNamePrefix: land1 + '_' + year + '_' + i,
    fileFormat: 'CSV'
  });
}

function rmCloud1(img) {
  var cloudShadowBitMask = (1 << 4);
  var cloudsBitMask = (1 << 3);
  var snowMask = (1 << 5);
  var qa = img.select("QA_PIXEL");
  var mask = qa.bitwiseAnd(cloudShadowBitMask).eq(0)
    .and(qa.bitwiseAnd(cloudsBitMask).eq(0))
    .and(qa.bitwiseAnd(snowMask).eq(0));
  return img.updateMask(mask);
}

function applyScaleFactors(image) {
  var notQABands = ['uBlue', 'Blue', 'Green', 'Red', 'Swir1', 'Nir', 'Swir2']
  var opticalBands = image.select(notQABands).multiply(0.0000275).add(-0.2);
  return image.addBands(opticalBands, null, true);
}

function Rrs(img){

  var B1=img.select(['uBlue']).divide(Math.PI)
  var B2=img.select(['Blue']).divide(Math.PI)
  var G=img.select(['Green']).divide(Math.PI)
  var R = img.select(['Red']).divide(Math.PI)
  var NIR = img.select(['Nir']).divide(Math.PI)
  var SWIR1 = img.select(['Swir1']).divide(Math.PI)
  var SWIR2 = img.select(['Swir2']).divide(Math.PI)

  var minIR = NIR.min(SWIR1).min(SWIR2).max(0);
  var minVisible = B1.min(B2).min(G).min(R);
  var subtractMask = minVisible.gt(minIR);

  B1 = B1.where(subtractMask, B1.subtract(minIR));
  B2 = B2.where(subtractMask, B2.subtract(minIR));
  G = G.where(subtractMask, G.subtract(minIR));
  R = R.where(subtractMask, R.subtract(minIR));

  img = img.addBands(B1, null, true);
  img = img.addBands(B2, null, true);
  img = img.addBands(G, null, true);
  img = img.addBands(R, null, true);
  img = img.addBands(NIR, null, true);
  img = img.addBands(SWIR1, null, true);
  img = img.addBands(SWIR2, null, true);
  var mask = B1.gt(0)
    .and(B2.gt(0))
    .and(G.gt(0))
    .and(R.gt(0))

  return img.updateMask(mask);
};

function shuiti(img){
  img = mndwi(img)
  img = ndvi(img)
  var MNDWI_S2 = img.select('mNDWI')

  var mask = MNDWI_S2.gte(0.1);

  var water_S2 = mask.rename("water").updateMask(mask);
  img = img.updateMask(water_S2)
  var feishuicao = img.select('NDVI').lte(0.1)
  img = img.updateMask(feishuicao)
  return img;
}

function ND_WI(image,b1,b2,bName)
{
  var WI = image.normalizedDifference([b1,b2]).rename(bName);
  return WI.updateMask(WI.gt(-1).and(WI.lt(1)));
}
function mndwi(img)
{
  var MNDWI=ND_WI(img,'Green','Swir1','mNDWI')
  return img.addBands(MNDWI);
}
function ndvi(img)
{
  var NDVI=ND_WI(img,'Nir','Red','NDVI')
  return img.addBands(NDVI);
}

function getal8(img){
  var img2 = img;
  var mask443 = img2.select('uBlue');
  var mask483 = img2.select('Blue');
  var mask561 = img2.select('Green');
  var mask655 = img2.select('Red');

  var imgX = img2.expression(
  '11.053 * mask443 +6.950 * mask483 + 51.135 * mask561 + 34.457 * mask655', {
    'mask443': mask443,
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgY = img2.expression(
  '1.320 * mask443 + 21.053 * mask483 + 66.023 * mask561 + 18.034 * mask655', {
    'mask443': mask443,
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgZ = img2.expression(
  '58.038 * mask443 +34.931 * mask483 + 2.606 * mask561 + 0.016 * mask655', {
    'mask443': mask443,
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });

  var imgx = imgX.divide(imgX.add(imgY).add(imgZ));
  var imgy = imgY.divide(imgX.add(imgY).add(imgZ));

  imgx = imgx.subtract(0.3333);
  imgy = imgy.subtract(0.3333);

  var imga = imgy.atan2(imgx);

  imga = img2.expression(
  'imga  * 180 / 3.1415926 + 180 ',{
    'imga': imga
  }) ;

  var delta = function(imga){
    var imgdetaa = imga.expression(
    'imga - 17.85*(imga/100)**5 + 97.42*(imga/100)**4 - 149.2*(imga/100)**3 + 5.901*(imga/100)**2 + 110.6*(imga/100) - 43.57',
    {
      'imga': imga
    });
    return imgdetaa;
  };
  var imga_delta = delta(imga).rename('imga');
  return img.addBands(imga_delta.rename('imga'));
}

function getal7(img){
  var img2 = img;
  var mask443 = img2.select('uBlue');
  var mask483 = img2.select('Blue');
  var mask561 = img2.select('Green');
  var mask655 = img2.select('Red');

  var imgX = img2.expression(
  '1.1302 * mask483 + 1.7517 * mask561 + 2.7689 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgY = img2.expression(
  '0.0601 * mask483 + 4.5907 * mask561 + 1 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgZ = img2.expression(
  '5.5934 * mask483 + 0.0565 * mask561 +0 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });

  var imgx = imgX.divide(imgX.add(imgY).add(imgZ));
  var imgy = imgY.divide(imgX.add(imgY).add(imgZ));

  imgx = imgx.subtract(0.3333);
  imgy = imgy.subtract(0.3333);

  var imga = imgy.atan2(imgx);

  imga = img2.expression(
  'imga  * 180 / 3.1415926 + 180 ',{
    'imga': imga
  }) ;

  var delta = function(imga){
    var imgdetaa = imga.expression(
    'imga + 16.4*(imga/100)**5 - 111.5*(imga/100)**4 + 271.2*(imga/100)**3 - 305.1*(imga/100)**2 + 177.6*(imga/100) - 24.27',
    {
      'imga': imga
    });
    return imgdetaa;
  };
  var imga_delta = delta(imga).rename('imga');
  return img.addBands(imga_delta.rename('imga'));
}

function getal5(img){
  var img2 = img;
  var mask443 = img2.select('uBlue');
  var mask483 = img2.select('Blue');
  var mask561 = img2.select('Green');
  var mask655 = img2.select('Red');

  var imgX = img2.expression(
  '1.1302 * mask483 + 1.7517 * mask561 + 2.7689 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgY = img2.expression(
  '0.0601 * mask483 + 4.5907 * mask561 + 1 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });
  var imgZ = img2.expression(
  '5.5934 * mask483 + 0.0565 * mask561 +0 * mask655', {
    'mask483': mask483,
    'mask561': mask561,
    'mask655': mask655
  });

  var imgx = imgX.divide(imgX.add(imgY).add(imgZ));
  var imgy = imgY.divide(imgX.add(imgY).add(imgZ));

  imgx = imgx.subtract(0.3333);
  imgy = imgy.subtract(0.3333);

  var imga = imgy.atan2(imgx);

  imga = img2.expression(
  'imga  * 180 / 3.1415926 + 180 ',{
    'imga': imga
  }) ;

  var delta = function(imga){
    var imgdetaa = imga.expression(
    'imga - 0.6201*(imga/100)**5 - 1.597*(imga/100)**4 + 32.11*(imga/100)**3 - 123.2*(imga/100)**2 + 167.5*(imga/100) - 31.99',
    {
      'imga': imga
    });
    return imgdetaa;
  };
  var imga_delta = delta(imga).rename('imga');
  return img.addBands(imga_delta.rename('imga'));
}
