let num = 0;

// get the search result
const urlParams = window.location.search;
function getListFromServer() {
    let url = "/searchLine" + urlParams;
    let page_title_flag = urlParams.includes('search=all');
    
    if(page_title_flag && urlParams.includes('status=found')) {
        document.getElementById('page_title').innerText = 'Found items:'
    } else if(page_title_flag && urlParams.includes('status=lost')){
        document.getElementById('page_title').innerText = 'Lost items:'
    } else {
        document.getElementById('page_title').innerText = 'Search results:'
    }
    
    let xhr = new XMLHttpRequest;
    xhr.open("GET",url);
    // Next, add an event listener for when the HTTP response is loaded
    xhr.addEventListener("load", function() {
        if (xhr.status == 200) {
          let responseStr = xhr.responseText;  // get the JSON string 
          let gList = JSON.parse(responseStr);  // turn it into an object
          
          for(let i = 0; i < gList.length; i++) {
              let json_node = gList[i];
              layout_boxes(
                  json_node.title,
                  json_node.category,
                  json_node.location,
                  json_node.found_date,
                  json_node.description,
                  json_node.imageURL
              );
          }

        } else {
          console.log(xhr.responseText);
        }

    });
    // Actually send request to server
    xhr.send();
  }

  getListFromServer();

function layout_boxes(title, category, location, date, description, image_url) {
    var div1 = document.createElement('div');
    var p1 = document.createElement('p');

    // small_box
    p1.textContent = title;

    div1.setAttribute('class', 'small_boxes');
    div1.setAttribute('id', 'small'+num);
    div1.appendChild(p1);
    document.body.appendChild(div1);
    document.getElementById('small'+num).style.display = 'block';

    //big box
    var big_box = document.createElement('div');
    var text_p = document.createElement('p');
    var big_inner_box = document.createElement('div');
    var pic_box = document.createElement('div');
    var image_tag = document.createElement('img');
    var text_container = document.createElement('div');

    var ul_tag = document.createElement('ul');

    var li_tag1 = document.createElement('li');
    var span_tag1 = document.createElement('span');
    var list_span_tag1 = document.createElement('span');

    var li_tag2 = document.createElement('li');
    var span_tag2 = document.createElement('span');
    var list_span_tag2 = document.createElement('span');

    var li_tag3 = document.createElement('li');
    var span_tag3 = document.createElement('span');
    var list_span_tag3 = document.createElement('span');

    var description_p = document.createElement('p');

    big_box.setAttribute('class', 'big_boxes');
    big_box.setAttribute('id', 'big' + num);

    text_p.textContent = title;

    big_inner_box.setAttribute('class', 'big_inner_box');

    pic_box.setAttribute('class', 'pic_box');
    image_tag.src = image_url;
    pic_box.appendChild(image_tag);

    text_container.setAttribute('class', 'text_container');

    span_tag1.textContent = 'Category';
    list_span_tag1.textContent = category;
    list_span_tag1.setAttribute('class', 'list_info');
    li_tag1.appendChild(span_tag1);
    li_tag1.appendChild(list_span_tag1);

    span_tag2.textContent = 'Loation';
    list_span_tag2.textContent = location;
    list_span_tag2.setAttribute('class', 'list_info');
    li_tag2.appendChild(span_tag2);
    li_tag2.appendChild(list_span_tag2);

    span_tag3.textContent = 'Date';
    list_span_tag3.textContent = date;
    list_span_tag3.setAttribute('class', 'list_info');
    li_tag3.appendChild(span_tag3);
    li_tag3.appendChild(list_span_tag3);

    ul_tag.appendChild(li_tag1);
    ul_tag.appendChild(li_tag2);
    ul_tag.appendChild(li_tag3);

    description_p.textContent = description;

    text_container.appendChild(ul_tag);
    text_container.appendChild(description_p);

    big_inner_box.appendChild(pic_box);
    big_inner_box.appendChild(text_container);

    big_box.appendChild(text_p);
    big_box.appendChild(big_inner_box);

    document.body.appendChild(big_box);

    document.getElementById('big'+num).style.display = 'none';

    let object1 = document.getElementById('small'+num);
    let object2 = document.getElementById('big'+num);

    document.getElementById('small'+num).addEventListener('click', () => {
        object1.style.display = 'none';
        object2.style.display = 'block';
    });
    document.getElementById('big'+num).addEventListener('click', () => {
        object1.style.display = 'block';
        object2.style.display = 'none';
    });

    num++;
}
