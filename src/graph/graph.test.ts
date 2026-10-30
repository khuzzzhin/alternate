import { describe } from 'vitest';
import { test } from '../tests';

describe('JanusGraph ', () => {
  test('', async ({ server, utils }) => {
    // await server.inject({
    //   method: 'POST',
    //   url: '/graph',
    //   payload: {
    //     query: `
    //       SELECT create_graph('alternate_graph');
    //     `,
    //   },
    // });

    await server.inject({
      method: 'POST',
      url: '/graph',
      payload: {
        query: `
          SELECT * FROM cypher('alternate_graph', $$
	          MATCH (v)
	          DETACH DELETE v
          $$) as (v agtype);
        `,
      },
    });

    const createResponse = await server.inject({
      method: 'POST',
      url: '/graph',
      payload: {
        query: `
          SELECT * FROM cypher('alternate_graph', $$
          
            CREATE (user:user { name: "khuzzzhin" })
            CREATE (barca:team { name: "FC Barcelona" })
            CREATE (astonVilla:team { name: "Aston Villa" })
            
            CREATE (node:player { name: "Pedri", age: 23 })
            CREATE (frenkie:player { name: "Frenkie De Jong", age: 29 })
            CREATE (emiliano:player { name: "Emiliano Martínez", age: 33 })
      
            CREATE (node)-[edge:MEMBER_OF]->(barca)
            CREATE (frenkie)-[edge2:MEMBER_OF { since: 2019 }]->(barca)
            CREATE (emiliano)-[edge3:MEMBER_OF { since: null }]->(astonVilla)

            RETURN node, edge
          $$) as (node json, edge json);
        `,
      },
    });

    const createResult = createResponse.json();

    const listResponse = await server.inject({
      method: 'POST',
      url: '/graph',
      payload: {
        query: `
          SELECT * from cypher('alternate_graph', $$
            MATCH (p:player)-[edge:MEMBER_OF]->(t:team)
            RETURN {
              player: p,
              team: t,
              since: edge.since
            } as result
          $$) as (result json);
        `,
      },
    });

    utils.inspect({ createResult, listResult: listResponse.json() });
  });
});
